import { useMemo, useState } from 'react';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, parseISO, getHours } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, TrendingUp, Package, Clock } from 'lucide-react';
import { Transaction } from '@/types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface POSSalesReportProps {
  transactions: Transaction[];
  onBack: () => void;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function POSSalesReport({ transactions, onBack }: POSSalesReportProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');

  const salesTransactions = useMemo(() => 
    transactions.filter(t => t.type === 'sale'),
    [transactions]
  );

  const dailyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySales = salesTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dayStart && txDate <= dayEnd;
      });

      return {
        date: format(date, 'EEE'),
        fullDate: format(date, 'MMM dd'),
        sales: daySales.reduce((sum, t) => sum + t.amount, 0),
        count: daySales.length,
      };
    });
    return last7Days;
  }, [salesTransactions]);

  const weeklyData = useMemo(() => {
    const last4Weeks = Array.from({ length: 4 }, (_, i) => {
      const weekStart = startOfWeek(subDays(new Date(), (3 - i) * 7));
      const weekEnd = endOfWeek(subDays(new Date(), (3 - i) * 7));
      
      const weekSales = salesTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= weekStart && txDate <= weekEnd;
      });

      return {
        week: `Week ${i + 1}`,
        dateRange: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd')}`,
        sales: weekSales.reduce((sum, t) => sum + t.amount, 0),
        count: weekSales.length,
      };
    });
    return last4Weeks;
  }, [salesTransactions]);

  const peakHoursData = useMemo(() => {
    const hourCounts: Record<number, { sales: number; count: number }> = {};
    
    salesTransactions.forEach(t => {
      const hour = getHours(new Date(t.date));
      if (!hourCounts[hour]) {
        hourCounts[hour] = { sales: 0, count: 0 };
      }
      hourCounts[hour].sales += t.amount;
      hourCounts[hour].count += 1;
    });

    return Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      sales: hourCounts[hour]?.sales || 0,
      count: hourCounts[hour]?.count || 0,
    })).filter(h => h.count > 0);
  }, [salesTransactions]);

  const topCategories = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    salesTransactions.forEach(t => {
      const category = t.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [salesTransactions]);

  const todayStats = useMemo(() => {
    const today = startOfDay(new Date());
    const todaySales = salesTransactions.filter(t => new Date(t.date) >= today);
    return {
      total: todaySales.reduce((sum, t) => sum + t.amount, 0),
      count: todaySales.length,
      average: todaySales.length > 0 
        ? todaySales.reduce((sum, t) => sum + t.amount, 0) / todaySales.length 
        : 0,
    };
  }, [salesTransactions]);

  const formatCurrency = (value: number) => `KES ${value.toLocaleString()}`;

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground">POS Sales Report</h1>
          <p className="text-sm text-muted-foreground">Analytics and performance metrics</p>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Today's Sales</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(todayStats.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs">Transactions</span>
            </div>
            <p className="text-lg font-bold text-foreground">{todayStats.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Avg Sale</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(todayStats.average)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Toggle */}
      <div className="flex gap-2">
        <Button 
          variant={period === 'daily' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setPeriod('daily')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Daily (7 days)
        </Button>
        <Button 
          variant={period === 'weekly' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setPeriod('weekly')}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Weekly (4 weeks)
        </Button>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={period === 'daily' ? dailyData : weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey={period === 'daily' ? 'date' : 'week'} 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  labelFormatter={(label) => period === 'daily' 
                    ? dailyData.find(d => d.date === label)?.fullDate 
                    : weeklyData.find(w => w.week === label)?.dateRange
                  }
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'sales' ? formatCurrency(value) : value,
                      name === 'sales' ? 'Sales' : 'Transactions'
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {topCategories.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend 
                      formatter={(value) => <span className="text-xs text-foreground capitalize">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No sales data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}