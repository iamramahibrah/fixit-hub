import { ArrowLeft, Download, FileText, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatKES } from '@/lib/constants';
import { Transaction, BusinessProfile } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VATReportProps {
  profile: BusinessProfile;
  transactions: Transaction[];
  summary: {
    outputVat: number;
    inputVat: number;
    vatPayable: number;
  };
  onBack: () => void;
}

export function VATReport({ profile, transactions, summary, onBack }: VATReportProps) {
  const currentMonth = new Date().toLocaleString('en-KE', { month: 'long', year: 'numeric' });
  
  // Calculate period details
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 20);

  const totalSales = transactions
    .filter(t => t.type === 'sale' && t.isVatApplicable)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPurchases = transactions
    .filter(t => t.type === 'expense' && t.isVatApplicable)
    .reduce((sum, t) => sum + t.amount, 0);

  const isRefund = summary.vatPayable < 0;

  const generateReportContent = () => {
    return `VAT REPORT - ${currentMonth}
=====================================
Business: ${profile.businessName}
KRA PIN: ${profile.kraPin}
VAT Status: ${profile.isVatRegistered ? 'Registered' : 'Not Registered'}

Period: ${periodStart.toLocaleDateString('en-KE')} - ${periodEnd.toLocaleDateString('en-KE')}
Filing Deadline: ${dueDate.toLocaleDateString('en-KE')}

VAT CALCULATION
---------------
Total Sales (VAT Applicable): KES ${totalSales.toLocaleString()}
Output VAT (16%): KES ${summary.outputVat.toLocaleString()}

Total Purchases (VAT Applicable): KES ${totalPurchases.toLocaleString()}
Input VAT (16%): KES ${summary.inputVat.toLocaleString()}

${isRefund ? 'VAT REFUND DUE' : 'VAT PAYABLE TO KRA'}: KES ${Math.abs(summary.vatPayable).toLocaleString()}

=====================================
Generated: ${new Date().toLocaleString('en-KE')}
`;
  };

  const generateCSVContent = () => {
    const headers = ['Description', 'Amount (KES)'];
    const rows = [
      ['Business Name', profile.businessName],
      ['KRA PIN', profile.kraPin],
      ['Period', `${periodStart.toLocaleDateString('en-KE')} - ${periodEnd.toLocaleDateString('en-KE')}`],
      ['Total Sales (VAT Applicable)', totalSales.toString()],
      ['Output VAT', summary.outputVat.toString()],
      ['Total Purchases (VAT Applicable)', totalPurchases.toString()],
      ['Input VAT', summary.inputVat.toString()],
      [isRefund ? 'VAT Refund Due' : 'VAT Payable', Math.abs(summary.vatPayable).toString()],
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const content = generateReportContent();
    const filename = `VAT_Report_${currentMonth.replace(' ', '_')}.txt`;
    downloadFile(content, filename, 'text/plain');
    toast.success('VAT Report downloaded', { description: filename });
  };

  const handleDownloadExcel = () => {
    const content = generateCSVContent();
    const filename = `VAT_Report_${currentMonth.replace(' ', '_')}.csv`;
    downloadFile(content, filename, 'text/csv');
    toast.success('VAT Report downloaded', { description: filename });
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">VAT Report</h1>
          <p className="text-sm text-muted-foreground">{currentMonth}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Business Info */}
        <Card variant="default" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">{profile.businessName}</p>
              <p className="text-xs text-muted-foreground">KRA PIN: {profile.kraPin}</p>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              profile.isVatRegistered 
                ? "bg-success/10 text-success" 
                : "bg-muted text-muted-foreground"
            )}>
              {profile.isVatRegistered ? 'VAT Registered' : 'Not VAT Registered'}
            </div>
          </div>
        </Card>

        {/* Period Info */}
        <Card variant="flat" className="p-4 bg-muted/30">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Period Start</p>
              <p className="font-medium">{periodStart.toLocaleDateString('en-KE')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Period End</p>
              <p className="font-medium">{periodEnd.toLocaleDateString('en-KE')}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Filing Deadline</p>
              <p className="font-medium text-warning">{dueDate.toLocaleDateString('en-KE')}</p>
            </div>
          </div>
        </Card>

        {/* VAT Summary */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">VAT Calculation</h2>
          
          <Card variant="success" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Output VAT (Sales)</p>
                  <p className="text-xs text-muted-foreground">On {formatKES(totalSales)} sales</p>
                </div>
              </div>
              <p className="text-lg font-bold text-success">{formatKES(summary.outputVat)}</p>
            </div>
          </Card>

          <Card variant="warning" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <TrendingDown className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Input VAT (Purchases)</p>
                  <p className="text-xs text-muted-foreground">On {formatKES(totalPurchases)} expenses</p>
                </div>
              </div>
              <p className="text-lg font-bold text-warning">-{formatKES(summary.inputVat)}</p>
            </div>
          </Card>

          <Card variant={isRefund ? 'success' : 'metric'} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isRefund ? "bg-success/10" : "bg-primary/10"
                )}>
                  <FileText className={cn(
                    "w-5 h-5",
                    isRefund ? "text-success" : "text-primary"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isRefund ? 'VAT Refund Due' : 'VAT Payable to KRA'}
                  </p>
                  <p className="text-xs text-muted-foreground">Output VAT - Input VAT</p>
                </div>
              </div>
              <p className={cn(
                "text-xl font-bold",
                isRefund ? "text-success" : "text-primary"
              )}>
                {formatKES(Math.abs(summary.vatPayable))}
              </p>
            </div>
          </Card>
        </div>

        {/* Alert for filing */}
        <Card variant="flat" className="p-4 bg-primary/5 border-primary/20">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Ready for iTax Filing</p>
              <p className="text-xs text-muted-foreground mt-1">
                This report is formatted for KRA VAT 3 return. Download and use these figures when filing on iTax.
              </p>
            </div>
          </div>
        </Card>

        {/* Download Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="default" size="lg" onClick={handleDownloadExcel}>
            <Download className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
