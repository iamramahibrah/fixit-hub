import { useEffect } from 'react';
import { toast } from 'sonner';
import { Deadline } from '@/types';
import { getDaysUntil, formatDate } from '@/lib/constants';
import { Bell, AlertTriangle, Clock } from 'lucide-react';

interface DeadlineRemindersProps {
  deadlines: Deadline[];
  reminderDaysBefore?: number;
}

export function useDeadlineReminders({ deadlines, reminderDaysBefore = 3 }: DeadlineRemindersProps) {
  useEffect(() => {
    if (!deadlines.length) return;

    const upcomingDeadlines = deadlines.filter((d) => {
      if (d.isCompleted) return false;
      const daysUntil = getDaysUntil(d.dueDate);
      return daysUntil >= 0 && daysUntil <= reminderDaysBefore;
    });

    // Show reminders for upcoming deadlines
    upcomingDeadlines.forEach((deadline) => {
      const daysUntil = getDaysUntil(deadline.dueDate);
      
      if (daysUntil === 0) {
        toast.error(`🚨 ${deadline.title} is DUE TODAY!`, {
          description: deadline.penalty 
            ? `Avoid KES ${deadline.penalty.toLocaleString()} penalty by filing now.`
            : 'File now to avoid penalties.',
          duration: 10000,
        });
      } else if (daysUntil === 1) {
        toast.warning(`⏰ ${deadline.title} is due TOMORROW!`, {
          description: deadline.penalty 
            ? `Avoid KES ${deadline.penalty.toLocaleString()} penalty.`
            : 'Don\'t forget to file on time.',
          duration: 8000,
        });
      } else {
        toast.info(`📅 ${deadline.title} due in ${daysUntil} days`, {
          description: `Due on ${formatDate(deadline.dueDate)}`,
          duration: 5000,
        });
      }
    });

    // Check for overdue deadlines
    const overdueDeadlines = deadlines.filter((d) => {
      if (d.isCompleted) return false;
      const daysUntil = getDaysUntil(d.dueDate);
      return daysUntil < 0;
    });

    overdueDeadlines.forEach((deadline) => {
      const daysOverdue = Math.abs(getDaysUntil(deadline.dueDate));
      toast.error(`❌ ${deadline.title} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} OVERDUE!`, {
        description: deadline.penalty 
          ? `Potential penalty: KES ${deadline.penalty.toLocaleString()}`
          : 'File immediately to minimize penalties.',
        duration: 15000,
      });
    });
  }, [deadlines, reminderDaysBefore]);
}

export function DeadlineReminders({ deadlines, reminderDaysBefore = 3 }: DeadlineRemindersProps) {
  useDeadlineReminders({ deadlines, reminderDaysBefore });
  return null;
}