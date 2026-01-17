import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatKES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  isCurrency?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  trendValue,
  variant = 'default',
  isCurrency = true
}: MetricCardProps) {
  const cardVariant = variant === 'default' ? 'metric' : variant;
  
  return (
    <Card variant={cardVariant} className="animate-fade-in">
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-2 sm:mb-3">
          <div className={cn(
            "p-1.5 sm:p-2 rounded-lg",
            variant === 'success' && "bg-success/10 text-success",
            variant === 'warning' && "bg-warning/10 text-warning",
            variant === 'danger' && "bg-destructive/10 text-destructive",
            variant === 'default' && "bg-primary/10 text-primary"
          )}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          
          {trend && trendValue && (
            <div className={cn(
              "flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full",
              trend === 'up' && "bg-success/10 text-success",
              trend === 'down' && "bg-destructive/10 text-destructive",
              trend === 'neutral' && "bg-muted text-muted-foreground"
            )}>
              {trend === 'up' && <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
              {trend === 'down' && <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
              {trendValue}
            </div>
          )}
        </div>
        
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate">{title}</p>
        <p className="text-base sm:text-xl font-bold text-foreground truncate">
          {isCurrency ? formatKES(value) : value.toLocaleString()}
        </p>
      </div>
    </Card>
  );
}
