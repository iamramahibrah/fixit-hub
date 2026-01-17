import { AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Deadline } from '@/types';
import { formatKES, getDaysUntil, formatDate } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface DeadlineCardProps {
  deadline: Deadline;
  onMarkComplete?: () => void;
}

export function DeadlineCard({ deadline, onMarkComplete }: DeadlineCardProps) {
  const daysUntil = getDaysUntil(deadline.dueDate);
  const isUrgent = daysUntil <= 3 && daysUntil >= 0;
  const isOverdue = daysUntil < 0;
  
  const variant = isOverdue ? 'danger' : isUrgent ? 'warning' : 'default';
  
  return (
    <Card variant={variant} className="animate-fade-in">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn(
            "p-2 rounded-lg",
            isOverdue && "bg-destructive/10 text-destructive",
            isUrgent && !isOverdue && "bg-warning/10 text-warning",
            !isUrgent && !isOverdue && "bg-primary/10 text-primary"
          )}>
            {isOverdue ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Calendar className="w-5 h-5" />
            )}
          </div>
          
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full",
            isOverdue && "bg-destructive text-destructive-foreground",
            isUrgent && !isOverdue && "bg-warning text-warning-foreground animate-pulse-soft",
            !isUrgent && !isOverdue && "bg-muted text-muted-foreground"
          )}>
            {isOverdue ? (
              `${Math.abs(daysUntil)} days overdue`
            ) : daysUntil === 0 ? (
              "Due today!"
            ) : (
              `${daysUntil} days left`
            )}
          </div>
        </div>
        
        <h3 className="font-semibold text-foreground mb-1">{deadline.title}</h3>
        <p className="text-sm text-muted-foreground mb-2">{deadline.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Due: {formatDate(deadline.dueDate)}
          </div>
          {deadline.penalty && (
            <div className={cn(
              "text-xs font-medium",
              isOverdue || isUrgent ? "text-destructive" : "text-muted-foreground"
            )}>
              Penalty: {formatKES(deadline.penalty)}
            </div>
          )}
        </div>
        
        {!deadline.isCompleted && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-3"
            onClick={onMarkComplete}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Mark as Filed
          </Button>
        )}
      </div>
    </Card>
  );
}
