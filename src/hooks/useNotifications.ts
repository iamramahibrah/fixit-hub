import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/components/notifications/NotificationPanel';
import { Deadline, Invoice, Product } from '@/types';
import { differenceInDays, isAfter, isBefore, addDays } from 'date-fns';

interface UseNotificationsProps {
  deadlines: Deadline[];
  invoices: Invoice[];
  products: Product[];
}

export function useNotifications({ deadlines, invoices, products }: UseNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('dismissedNotifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('readNotifications');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Generate notifications from data
  useEffect(() => {
    const newNotifications: Notification[] = [];
    const now = new Date();
    const sevenDaysFromNow = addDays(now, 7);

    // Deadline notifications
    deadlines
      .filter(d => !d.isCompleted && !dismissedIds.has(`deadline-${d.id}`))
      .forEach(deadline => {
        const daysUntil = differenceInDays(deadline.dueDate, now);
        
        if (daysUntil <= 7 && daysUntil >= 0) {
          newNotifications.push({
            id: `deadline-${deadline.id}`,
            title: deadline.title,
            message: daysUntil === 0 
              ? 'Due today! Complete this to avoid penalties.'
              : `Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}. ${deadline.penalty ? `Penalty: KES ${deadline.penalty.toLocaleString()}` : ''}`,
            type: daysUntil <= 2 ? 'warning' : 'deadline',
            isRead: readIds.has(`deadline-${deadline.id}`),
            createdAt: new Date(deadline.dueDate),
          });
        } else if (daysUntil < 0) {
          newNotifications.push({
            id: `deadline-overdue-${deadline.id}`,
            title: `${deadline.title} is OVERDUE`,
            message: `This was due ${Math.abs(daysUntil)} day${Math.abs(daysUntil) > 1 ? 's' : ''} ago. ${deadline.penalty ? `Potential penalty: KES ${deadline.penalty.toLocaleString()}` : ''}`,
            type: 'warning',
            isRead: readIds.has(`deadline-overdue-${deadline.id}`),
            createdAt: new Date(deadline.dueDate),
          });
        }
      });

    // Overdue invoice notifications
    invoices
      .filter(inv => inv.status === 'overdue' && !dismissedIds.has(`invoice-overdue-${inv.id}`))
      .forEach(invoice => {
        const daysOverdue = differenceInDays(now, invoice.dueDate);
        newNotifications.push({
          id: `invoice-overdue-${invoice.id}`,
          title: `Invoice ${invoice.invoiceNumber} is overdue`,
          message: `Payment from ${invoice.customer.name} is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. Amount: KES ${invoice.total.toLocaleString()}`,
          type: 'invoice',
          isRead: readIds.has(`invoice-overdue-${invoice.id}`),
          createdAt: invoice.dueDate,
        });
      });

    // Low stock notifications
    products
      .filter(p => p.minimumStock && p.quantity <= p.minimumStock && !dismissedIds.has(`stock-${p.id}`))
      .forEach(product => {
        newNotifications.push({
          id: `stock-${product.id}`,
          title: 'Low Stock Alert',
          message: `${product.name} is running low. Current: ${product.quantity}, Minimum: ${product.minimumStock}`,
          type: 'warning',
          isRead: readIds.has(`stock-${product.id}`),
          createdAt: product.updatedAt,
        });
      });

    // Sort by date (newest first) and unread first
    newNotifications.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    setNotifications(newNotifications);
  }, [deadlines, invoices, products, dismissedIds, readIds]);

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('readNotifications', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      localStorage.setItem('readNotifications', JSON.stringify([...next]));
      return next;
    });
  }, [notifications]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('dismissedNotifications', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
}