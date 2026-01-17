import { Plus, Receipt, FileText, Calculator, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickActionsProps {
  onAddSale: () => void;
  onAddExpense: () => void;
  onCreateInvoice: () => void;
  onViewVAT: () => void;
  onViewEtims?: () => void;
}

export function QuickActions({ onAddSale, onAddExpense, onCreateInvoice, onViewVAT, onViewEtims }: QuickActionsProps) {
  const actions = [
    { label: 'Add Sale', icon: Plus, onClick: onAddSale, primary: true },
    { label: 'Add Expense', icon: Receipt, onClick: onAddExpense },
    { label: 'Invoice', icon: FileText, onClick: onCreateInvoice },
    { label: 'VAT', icon: Calculator, onClick: onViewVAT },
    { label: 'eTIMS', icon: FileCheck, onClick: onViewEtims },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.primary ? "default" : "quick"}
          onClick={action.onClick}
          className="flex-col h-auto py-3 px-2 touch-target"
        >
          <action.icon className="w-5 h-5 mb-1" />
          <span className="text-[10px] sm:text-xs font-medium">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
