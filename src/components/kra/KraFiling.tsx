import { useState } from 'react';
import { FileText, Upload, AlertCircle, CheckCircle, Loader2, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Invoice, BusinessProfile } from '@/types';
import { formatKES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface KraFilingProps {
  profile: BusinessProfile;
  transactions: Transaction[];
  invoices: Invoice[];
}

type FilingType = 'vat' | 'income_tax' | 'nil';
type FilingPeriod = 'monthly' | 'quarterly' | 'annual';

interface FilingData {
  period: string;
  totalSales: number;
  totalExpenses: number;
  outputVat: number;
  inputVat: number;
  vatPayable: number;
  invoiceCount: number;
  transactionCount: number;
}

export function KraFiling({ profile, transactions, invoices }: KraFilingProps) {
  const [filingType, setFilingType] = useState<FilingType>('vat');
  const [filingPeriod, setFilingPeriod] = useState<FilingPeriod>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filingResult, setFilingResult] = useState<{ success: boolean; message: string } | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().slice(0, 7),
      label: date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
    };
  });

  const calculateFilingData = (): FilingData => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const periodTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= periodStart && date <= periodEnd;
    });

    const periodInvoices = invoices.filter((inv) => {
      const date = new Date(inv.createdAt);
      return date >= periodStart && date <= periodEnd;
    });

    const totalSales = periodTransactions
      .filter((t) => t.type === 'sale')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const outputVat = periodTransactions
      .filter((t) => t.type === 'sale' && t.isVatApplicable)
      .reduce((sum, t) => sum + (t.vatAmount || t.amount * 0.16), 0);

    const inputVat = periodTransactions
      .filter((t) => t.type === 'expense' && t.isVatApplicable)
      .reduce((sum, t) => sum + (t.vatAmount || t.amount * 0.16), 0);

    return {
      period: selectedMonth,
      totalSales,
      totalExpenses,
      outputVat,
      inputVat,
      vatPayable: outputVat - inputVat,
      invoiceCount: periodInvoices.length,
      transactionCount: periodTransactions.length,
    };
  };

  const filingData = calculateFilingData();

  const handleSubmitFiling = async () => {
    if (!profile.kraPin) {
      toast.error('KRA PIN required', { description: 'Please set your KRA PIN in settings' });
      return;
    }

    if (!profile.kraApiKey || !profile.kraApiSecret) {
      toast.error('KRA API credentials required', { 
        description: 'Please configure your KRA API keys in settings to enable filing' 
      });
      return;
    }

    setIsSubmitting(true);
    setFilingResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('kra-api', {
        body: {
          action: 'nil_filing',
          pin: profile.kraPin,
          filingType,
          period: selectedMonth,
          data: filingType === 'nil' ? {} : {
            totalSales: filingData.totalSales,
            totalExpenses: filingData.totalExpenses,
            outputVat: filingData.outputVat,
            inputVat: filingData.inputVat,
            vatPayable: filingData.vatPayable,
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        setFilingResult({ 
          success: true, 
          message: `Filing submitted successfully. Reference: ${data.reference || 'N/A'}` 
        });
        toast.success('KRA Filing Submitted', { 
          description: `Your ${filingType.toUpperCase()} return has been filed successfully` 
        });
      } else {
        throw new Error(data.message || 'Filing failed');
      }
    } catch (error: any) {
      console.error('KRA filing error:', error);
      setFilingResult({ 
        success: false, 
        message: error.message || 'Failed to submit filing' 
      });
      toast.error('Filing Failed', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateFilingReport = () => {
    const report = `KRA TAX RETURN REPORT
=====================================
Business: ${profile.businessName}
KRA PIN: ${profile.kraPin}
Filing Type: ${filingType.toUpperCase()}
Period: ${months.find(m => m.value === selectedMonth)?.label}

SUMMARY
-------
Total Sales: ${formatKES(filingData.totalSales)}
Total Expenses: ${formatKES(filingData.totalExpenses)}
${filingType === 'vat' ? `
VAT CALCULATION
---------------
Output VAT (16%): ${formatKES(filingData.outputVat)}
Input VAT (16%): ${formatKES(filingData.inputVat)}
VAT Payable: ${formatKES(filingData.vatPayable)}
` : ''}
Supporting Documents
--------------------
Invoices: ${filingData.invoiceCount}
Transactions: ${filingData.transactionCount}

=====================================
Generated: ${new Date().toLocaleString('en-KE')}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KRA_Filing_${filingType}_${selectedMonth}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Report Downloaded', { description: 'Filing report has been downloaded' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            KRA Tax Return Filing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filing Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Filing Type</Label>
              <Select value={filingType} onValueChange={(v) => setFilingType(v as FilingType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vat">VAT Return (VAT 3)</SelectItem>
                  <SelectItem value="income_tax">Income Tax</SelectItem>
                  <SelectItem value="nil">Nil Return</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filing Period</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>KRA PIN</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm">
                {profile.kraPin || 'Not configured'}
              </div>
            </div>
          </div>

          {/* Filing Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="flat" className="p-4">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-lg font-bold text-success">{formatKES(filingData.totalSales)}</p>
            </Card>
            <Card variant="flat" className="p-4">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-bold text-destructive">{formatKES(filingData.totalExpenses)}</p>
            </Card>
            {filingType === 'vat' && (
              <>
                <Card variant="flat" className="p-4">
                  <p className="text-xs text-muted-foreground">Output VAT</p>
                  <p className="text-lg font-bold">{formatKES(filingData.outputVat)}</p>
                </Card>
                <Card variant="flat" className="p-4">
                  <p className="text-xs text-muted-foreground">VAT Payable</p>
                  <p className={cn(
                    "text-lg font-bold",
                    filingData.vatPayable >= 0 ? "text-destructive" : "text-success"
                  )}>
                    {formatKES(Math.abs(filingData.vatPayable))}
                  </p>
                </Card>
              </>
            )}
          </div>

          {/* Supporting Documents */}
          <Card variant="flat" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium">Supporting Documents</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoices</span>
                <span className="font-medium">{filingData.invoiceCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transactions</span>
                <span className="font-medium">{filingData.transactionCount}</span>
              </div>
            </div>
          </Card>

          {/* Filing Status */}
          {filingResult && (
            <Card variant={filingResult.success ? 'success' : 'danger'} className="p-4">
              <div className="flex items-center gap-3">
                {filingResult.success ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                )}
                <div>
                  <p className="font-medium">
                    {filingResult.success ? 'Filing Submitted' : 'Filing Failed'}
                  </p>
                  <p className="text-sm text-muted-foreground">{filingResult.message}</p>
                </div>
              </div>
            </Card>
          )}

          {/* API Credentials Warning */}
          {(!profile.kraApiKey || !profile.kraApiSecret) && (
            <Card variant="warning" className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-warning" />
                <div>
                  <p className="font-medium text-warning">KRA API Not Configured</p>
                  <p className="text-sm text-muted-foreground">
                    Configure your KRA GavaConnect API credentials in Settings to enable direct filing
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSubmitFiling}
              disabled={isSubmitting || !profile.kraPin || !profile.kraApiKey}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit to KRA
                </>
              )}
            </Button>
            <Button variant="outline" onClick={generateFilingReport}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
