import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';
import { formatKES, formatDate, EXPENSE_CATEGORIES, SALE_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll: () => void;
}

export function RecentTransactions({ transactions, onViewAll }: RecentTransactionsProps) {
  const recentTransactions = transactions.slice(0, 5);

  const getCategoryLabel = (type: 'sale' | 'expense', category: string) => {
    if (type === 'sale') {
      return SALE_CATEGORIES.find(c => c.value === category)?.label || category;
    }
    return EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <Card variant="default">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-primary">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No transactions yet</p>
            <p className="text-xs mt-1">Add your first sale or expense</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <div
                key={transaction.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  transaction.type === 'sale' 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {transaction.type === 'sale' ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getCategoryLabel(transaction.type, transaction.category)} • {formatDate(new Date(transaction.date))}
                  </p>
                </div>
                
                <div className={cn(
                  "text-sm font-semibold whitespace-nowrap",
                  transaction.type === 'sale' ? "text-success" : "text-destructive"
                )}>
                  {transaction.type === 'sale' ? '+' : '-'}{formatKES(transaction.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
