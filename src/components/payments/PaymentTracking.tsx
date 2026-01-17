import { useState, useEffect } from 'react';
import { ArrowLeft, Search, RefreshCw, CreditCard, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { formatKES, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Invoice, BusinessProfile } from '@/types';

interface PaymentTrackingProps {
  invoices: Invoice[];
  profile: BusinessProfile;
  onBack: () => void;
  onUpdateStatus: (id: string, status: Invoice['status']) => Promise<void>;
}

interface PaymentStatus {
  invoiceId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  transactionId?: string;
  amount: number;
  lastChecked: Date;
}

export function PaymentTracking({ invoices, profile, onBack, onUpdateStatus }: PaymentTrackingProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatuses, setPaymentStatuses] = useState<Map<string, PaymentStatus>>(new Map());
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null);

  // Filter invoices that have been sent or are awaiting payment
  const payableInvoices = invoices.filter(inv => 
    inv.status === 'sent' || inv.status === 'paid' || inv.status === 'overdue'
  );

  const filteredInvoices = payableInvoices.filter((inv) => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const summary = {
    total: payableInvoices.reduce((sum, inv) => sum + inv.total, 0),
    paid: payableInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    pending: payableInvoices.filter(i => i.status === 'sent').reduce((sum, inv) => sum + inv.total, 0),
    overdue: payableInvoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0),
  };

  const checkPaymentStatus = async (invoice: Invoice) => {
    if (!profile.stripeSecretKey && !profile.mpesaConsumerKey) {
      toast.error('Payment gateway not configured', {
        description: 'Please contact admin to configure payment settings',
      });
      return;
    }

    setCheckingPayment(invoice.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('paystack-payment', {
        body: {
          action: 'verify_payment',
          userId: user?.id,
          reference: invoice.invoiceNumber,
        },
      });

      if (error) throw error;

      if (data.status === 'success') {
        await onUpdateStatus(invoice.id, 'paid');
        toast.success('Payment confirmed!', {
          description: `Invoice ${invoice.invoiceNumber} marked as paid`,
        });
      } else if (data.status === 'failed') {
        toast.error('Payment failed', {
          description: 'The payment was not successful',
        });
      } else {
        toast.info('Payment pending', {
          description: 'Payment is still being processed',
        });
      }

      setPaymentStatuses(prev => new Map(prev).set(invoice.id, {
        invoiceId: invoice.id,
        status: data.status === 'success' ? 'completed' : 
                data.status === 'failed' ? 'failed' : 'pending',
        transactionId: data.reference,
        amount: invoice.total,
        lastChecked: new Date(),
      }));
    } catch (error) {
      console.error('Error checking payment:', error);
      toast.error('Failed to check payment status');
    } finally {
      setCheckingPayment(null);
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Clock className="h-4 w-4" />;
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusStyle = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return 'bg-success/20 text-success hover:bg-success/30';
      case 'sent': return 'bg-primary/20 text-primary hover:bg-primary/30';
      case 'overdue': return 'bg-destructive/20 text-destructive hover:bg-destructive/30';
      default: return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const hasPaymentConfigured = !!profile.stripeSecretKey || !!profile.mpesaConsumerKey;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment Tracking</h1>
            <p className="text-sm text-muted-foreground">Monitor payment status</p>
          </div>
        </div>
      </div>

      {/* Payment Gateway Status */}
      {!hasPaymentConfigured && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div>
              <p className="font-medium text-foreground">Payment gateway not configured</p>
              <p className="text-sm text-muted-foreground">
                Contact admin to configure Stripe or M-Pesa payment settings
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Invoiced</p>
            <p className="text-lg font-bold text-foreground">{formatKES(summary.total)}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Received</p>
            <p className="text-lg font-bold text-success">{formatKES(summary.paid)}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Awaiting</p>
            <p className="text-lg font-bold text-primary">{formatKES(summary.pending)}</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-lg font-bold text-destructive">{formatKES(summary.overdue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payments to track</p>
              <p className="text-sm text-muted-foreground">Send invoices to start collecting payments</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.customer.name}</p>
                          {invoice.customer.phone && (
                            <p className="text-xs text-muted-foreground">{invoice.customer.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs gap-1", getStatusStyle(invoice.status))}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatKES(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status !== 'paid' && hasPaymentConfigured && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => checkPaymentStatus(invoice)}
                              disabled={checkingPayment === invoice.id}
                            >
                              <RefreshCw className={cn(
                                "h-4 w-4 mr-1",
                                checkingPayment === invoice.id && "animate-spin"
                              )} />
                              Check
                            </Button>
                          )}
                          {invoice.status !== 'paid' && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => onUpdateStatus(invoice.id, 'paid')}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredInvoices.length} of {payableInvoices.length} payments
      </p>
    </div>
  );
}
