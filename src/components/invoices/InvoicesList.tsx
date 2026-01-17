import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Send, Eye, Trash2, CheckCircle, Clock, AlertCircle, Download, CreditCard, Banknote, Loader2, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Invoice, BusinessProfile } from '@/types';
import { formatKES, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { generateInvoicePdf } from '@/lib/generateInvoicePdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EtimsStatusBadge, EtimsSubmitButton, EtimsQrCodeDisplay } from '@/components/etims';

interface InvoicesListProps {
  invoices: Invoice[];
  profile: BusinessProfile;
  onBack: () => void;
  onUpdateStatus: (id: string, status: Invoice['status']) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function InvoicesList({ invoices, profile, onBack, onUpdateStatus, onDelete }: InvoicesListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  const hasStripeConfigured = !!profile.stripeSecretKey;

  const initiatePayment = async (invoice: Invoice) => {
    if (!hasStripeConfigured) {
      toast.error('Stripe not configured', {
        description: 'Please contact admin to configure payment settings',
      });
      return;
    }

    setPayingInvoice(invoice.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('paystack-payment', {
        body: {
          action: 'initiate_payment',
          userId: user?.id,
          amount: invoice.total,
          currency: 'KES',
          description: `Payment for ${invoice.invoiceNumber}`,
          reference: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          customerPhone: invoice.customer.phone || '',
          customerEmail: invoice.customer.email || '',
          callbackUrl: `${window.location.origin}/payment-callback`,
        },
      });

      if (error) throw error;

      if (data?.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        toast.success('Payment initiated', {
          description: 'Customer can complete payment in the new window',
        });
      } else {
        throw new Error('No redirect URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Payment failed', {
        description: error.message || 'Failed to initiate payment',
      });
    } finally {
      setPayingInvoice(null);
    }
  };
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch = 
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.customer.name.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const summary = useMemo(() => {
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
    const pending = invoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((sum, inv) => sum + inv.total, 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0);
    return { total, paid, pending, overdue };
  }, [invoices]);

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
            <p className="text-sm text-muted-foreground">Manage and track all invoices</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{formatKES(summary.total)}</p>
          </CardContent>
        </Card>
        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-lg font-bold text-success">{formatKES(summary.paid)}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
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
                placeholder="Search invoices..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No invoices found</p>
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
                    <TableHead>eTIMS</TableHead>
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
                          {invoice.customer.email && (
                            <p className="text-xs text-muted-foreground">{invoice.customer.email}</p>
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
                      <TableCell>
                        <EtimsStatusBadge 
                          status={invoice.etimsStatus} 
                          controlNumber={invoice.etimsControlNumber}
                          qrCode={invoice.etimsQrCode}
                          showQrButton
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatKES(invoice.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>{invoice.invoiceNumber}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Customer</p>
                                  <p className="font-medium">{invoice.customer.name}</p>
                                  {invoice.customer.phone && <p className="text-sm">{invoice.customer.phone}</p>}
                                  {invoice.customer.email && <p className="text-sm">{invoice.customer.email}</p>}
                                </div>
                                <div className="border-t pt-4">
                                  <p className="text-sm font-medium mb-2">Items</p>
                                  {invoice.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-1">
                                      <span>{item.description} x{item.quantity}</span>
                                      <span>{formatKES(item.total)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="border-t pt-4 space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Subtotal</span>
                                    <span>{formatKES(invoice.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>VAT (16%)</span>
                                    <span>{formatKES(invoice.vatAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Payment</span>
                                    <span className="flex items-center gap-1">
                                      {invoice.paymentMethod === 'mpesa' ? <CreditCard className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                                      {invoice.paymentMethod === 'mpesa' ? 'M-Pesa' : 'Cash'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>{formatKES(invoice.total)}</span>
                                  </div>
                                </div>
                                {/* eTIMS QR Code Display */}
                                {invoice.etimsQrCode && (invoice.etimsStatus === 'submitted' || invoice.etimsStatus === 'verified') && (
                                  <EtimsQrCodeDisplay 
                                    qrCode={invoice.etimsQrCode} 
                                    controlNumber={invoice.etimsControlNumber}
                                  />
                                )}
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                      variant="outline"
                                      onClick={() => generateInvoicePdf(invoice, profile)}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download PDF
                                    </Button>
                                    {invoice.status !== 'paid' && (
                                      <Button 
                                        variant="success"
                                        onClick={() => {
                                          onUpdateStatus(invoice.id, 'paid');
                                          setSelectedInvoice(null);
                                        }}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Mark as Paid
                                      </Button>
                                    )}
                                  </div>
                                  {invoice.status !== 'paid' && hasStripeConfigured && (
                                    <Button 
                                      className="w-full bg-[#00C3F7] hover:bg-[#00a8d6] text-white"
                                      onClick={() => {
                                        initiatePayment(invoice);
                                        setSelectedInvoice(null);
                                      }}
                                      disabled={payingInvoice === invoice.id}
                                    >
                                      {payingInvoice === invoice.id ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <CreditCard className="h-4 w-4 mr-2" />
                                      )}
                                      Pay with Paystack
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onUpdateStatus(invoice.id, 'sent')}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete invoice {invoice.invoiceNumber}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => onDelete(invoice.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
        Showing {filteredInvoices.length} of {invoices.length} invoices
      </p>
    </div>
  );
}