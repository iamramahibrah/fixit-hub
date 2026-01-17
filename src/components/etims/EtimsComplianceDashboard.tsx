import { useState, useEffect } from 'react';
import { ArrowLeft, FileCheck, AlertCircle, Clock, CheckCircle, XCircle, RefreshCw, ExternalLink, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { formatKES, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { EtimsStatusBadge } from './EtimsStatusBadge';
import { EtimsSubmitButton } from './EtimsSubmitButton';
import { toast } from 'sonner';

interface EtimsSubmission {
  id: string;
  invoice_id: string;
  status: 'pending' | 'submitted' | 'verified' | 'failed' | 'cancelled';
  control_unit_number: string | null;
  error_message: string | null;
  created_at: string;
  submitted_at: string | null;
  invoice?: {
    invoice_number: string;
    customer_name: string;
    total: number;
  };
}

interface InvoiceWithEtims {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  created_at: string;
  etims_status: 'pending' | 'submitted' | 'verified' | 'failed' | 'cancelled' | null;
  etims_control_number: string | null;
  etims_qr_code: string | null;
}

interface EtimsComplianceDashboardProps {
  onBack: () => void;
}

export function EtimsComplianceDashboard({ onBack }: EtimsComplianceDashboardProps) {
  const [invoices, setInvoices] = useState<InvoiceWithEtims[]>([]);
  const [submissions, setSubmissions] = useState<EtimsSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch invoices with eTIMS status
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, customer_name, total, created_at, etims_status, etims_control_number, etims_qr_code')
        .order('created_at', { ascending: false })
        .limit(50);

      if (invoiceError) throw invoiceError;
      setInvoices(invoiceData || []);

      // Fetch recent submissions
      const { data: submissionData, error: submissionError } = await supabase
        .from('etims_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (submissionError) throw submissionError;
      setSubmissions(submissionData || []);

    } catch (error) {
      console.error('Error fetching eTIMS data:', error);
      toast.error('Failed to load eTIMS data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Get invoices eligible for batch submission (not submitted, not verified)
  const eligibleForSubmission = invoices.filter(
    i => !i.etims_status || i.etims_status === 'pending' || i.etims_status === 'failed'
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(eligibleForSubmission.map(i => i.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  const handleBatchSubmit = async () => {
    if (selectedInvoices.length === 0) {
      toast.error('Please select invoices to submit');
      return;
    }

    setBatchSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const invoiceId of selectedInvoices) {
      try {
        const { data, error } = await supabase.functions.invoke('etims-submit', {
          body: { action: 'submit', invoiceId },
        });

        if (error) throw error;

        if (data.success) {
          successCount++;
          setInvoices(prev => prev.map(inv =>
            inv.id === invoiceId
              ? { ...inv, etims_status: 'submitted' as const, etims_control_number: data.controlNumber, etims_qr_code: data.qrCode }
              : inv
          ));
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to submit invoice ${invoiceId}:`, error);
        failCount++;
      }
    }

    setBatchSubmitting(false);
    setSelectedInvoices([]);

    if (successCount > 0) {
      toast.success(`Successfully submitted ${successCount} invoice${successCount > 1 ? 's' : ''} to eTIMS`);
    }
    if (failCount > 0) {
      toast.error(`Failed to submit ${failCount} invoice${failCount > 1 ? 's' : ''}`);
    }

    fetchData();
  };

  // Calculate statistics
  const stats = {
    total: invoices.length,
    submitted: invoices.filter(i => i.etims_status === 'submitted' || i.etims_status === 'verified').length,
    verified: invoices.filter(i => i.etims_status === 'verified').length,
    pending: invoices.filter(i => !i.etims_status || i.etims_status === 'pending').length,
    failed: invoices.filter(i => i.etims_status === 'failed').length,
  };

  const complianceRate = stats.total > 0 
    ? Math.round((stats.submitted / stats.total) * 100) 
    : 0;

  const handleSubmitSuccess = (invoiceId: string, result: { controlNumber: string; qrCode?: string }) => {
    setInvoices(prev => prev.map(inv => 
      inv.id === invoiceId 
        ? { ...inv, etims_status: 'submitted' as const, etims_control_number: result.controlNumber, etims_qr_code: result.qrCode || null }
        : inv
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              eTIMS Compliance
            </h1>
            <p className="text-sm text-muted-foreground">
              Track invoice submissions to KRA's Electronic Tax Invoice System
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedInvoices.length > 0 && (
            <Button 
              onClick={handleBatchSubmit} 
              disabled={batchSubmitting}
              className="gap-2"
            >
              {batchSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit {selectedInvoices.length} to eTIMS
            </Button>
          )}
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileCheck className="h-4 w-4" />
              <span className="text-xs">Total Invoices</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Submitted</span>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.submitted}</p>
          </CardContent>
        </Card>

        <Card className="bg-success/10 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Verified</span>
            </div>
            <p className="text-2xl font-bold text-success">{stats.verified}</p>
          </CardContent>
        </Card>

        <Card className="bg-warning/10 border-warning/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-warning mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Failed</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Compliance Rate</span>
            <Badge variant={complianceRate >= 80 ? 'default' : complianceRate >= 50 ? 'secondary' : 'destructive'}>
              {complianceRate}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={complianceRate} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {stats.submitted} of {stats.total} invoices submitted to KRA eTIMS
          </p>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
            {eligibleForSubmission.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedInvoices.length === eligibleForSubmission.length && eligibleForSubmission.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <span className="text-sm text-muted-foreground">Select all pending</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
              <p className="text-sm text-muted-foreground">Create invoices to start tracking eTIMS compliance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>eTIMS Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const isEligible = !invoice.etims_status || invoice.etims_status === 'pending' || invoice.etims_status === 'failed';
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          {isEligible && (
                            <Checkbox
                              checked={selectedInvoices.includes(invoice.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                              disabled={batchSubmitting}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>{invoice.customer_name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(new Date(invoice.created_at))}
                        </TableCell>
                        <TableCell className="font-medium">{formatKES(invoice.total)}</TableCell>
                        <TableCell>
                          <EtimsStatusBadge 
                            status={invoice.etims_status} 
                            controlNumber={invoice.etims_control_number}
                            qrCode={invoice.etims_qr_code}
                            showQrButton
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <EtimsSubmitButton
                            invoiceId={invoice.id}
                            currentStatus={invoice.etims_status}
                            size="sm"
                            onSubmitSuccess={(result) => handleSubmitSuccess(invoice.id, result)}
                            onStatusChange={(status) => {
                              setInvoices(prev => prev.map(inv => 
                                inv.id === invoice.id ? { ...inv, etims_status: status } : inv
                              ));
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KRA eTIMS Info Card */}
      <Card variant="gradient" className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">About KRA eTIMS</h3>
              <p className="text-sm text-muted-foreground">
                The Electronic Tax Invoice Management System (eTIMS) is a KRA platform that ensures 
                tax compliance by registering all business transactions in real-time. All VAT-registered 
                businesses are required to submit invoices through eTIMS.
              </p>
              <a 
                href="https://www.kra.go.ke/etims" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Learn more about eTIMS
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
