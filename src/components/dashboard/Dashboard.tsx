import { Wallet, TrendingUp, TrendingDown, Receipt, Scale } from 'lucide-react';
import { MetricCard } from './MetricCard';
import { DeadlineCard } from './DeadlineCard';
import { QuickActions } from './QuickActions';
import { RecentTransactions } from './RecentTransactions';
import { DashboardCharts } from './DashboardCharts';
import { Transaction, Deadline, BusinessProfile } from '@/types';

interface DashboardProps {
  profile: BusinessProfile;
  transactions: Transaction[];
  deadlines: Deadline[];
  summary: {
    todaySales: number;
    todayExpenses: number;
    todayBalance: number;
    monthlySales: number;
    monthlyExpenses: number;
    monthlyProfit: number;
    vatPayable: number;
  };
  onAddSale: () => void;
  onAddExpense: () => void;
  onCreateInvoice: () => void;
  onViewVAT: () => void;
  onViewTransactions: () => void;
  onViewEtims?: () => void;
}

export function Dashboard({
  profile,
  transactions,
  deadlines,
  summary,
  onAddSale,
  onAddExpense,
  onCreateInvoice,
  onViewVAT,
  onViewTransactions,
  onViewEtims,
}: DashboardProps) {
  const upcomingDeadlines = deadlines
    .filter(d => !d.isCompleted)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 2);

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Welcome Section */}
      <div className="animate-fade-in">
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">
          Hello, {profile.businessName.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm lg:text-base text-muted-foreground mt-1">
          Here's your business at a glance
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions
        onAddSale={onAddSale}
        onAddExpense={onAddExpense}
        onCreateInvoice={onCreateInvoice}
        onViewVAT={onViewVAT}
        onViewEtims={onViewEtims}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <MetricCard
          title="Today's Sales"
          value={summary.todaySales}
          icon={Wallet}
          variant="success"
        />
        <MetricCard
          title="Today's Expenses"
          value={summary.todayExpenses}
          icon={Receipt}
          variant="warning"
        />
        <MetricCard
          title="Daily Balance"
          value={summary.todayBalance}
          icon={Scale}
          variant={summary.todayBalance >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          title="Monthly Profit"
          value={summary.monthlyProfit}
          icon={summary.monthlyProfit >= 0 ? TrendingUp : TrendingDown}
          variant={summary.monthlyProfit >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          title="Total Expenses"
          value={summary.monthlyExpenses}
          icon={Receipt}
          variant="warning"
        />
      </div>

      {/* Profit/Loss Indicator */}
      {summary.monthlyProfit < 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/20">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Monthly Loss</p>
              <p className="text-sm text-muted-foreground">
                Your expenses exceed sales by <span className="font-bold text-destructive">KES {Math.abs(summary.monthlyProfit).toLocaleString()}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <DashboardCharts transactions={transactions} />

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">KRA Deadlines</h2>
          {upcomingDeadlines.map((deadline) => (
            <DeadlineCard key={deadline.id} deadline={deadline} />
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      <RecentTransactions 
        transactions={transactions} 
        onViewAll={onViewTransactions}
      />
    </div>
  );
}
