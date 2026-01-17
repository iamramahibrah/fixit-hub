import { LogOut, Crown, Sparkles, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BusinessProfile } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { NotificationPanel, Notification } from '@/components/notifications/NotificationPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  profile: BusinessProfile;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismissNotification: (id: string) => void;
  onSignOut?: () => void;
  onManageSubscription?: () => void;
}

export function Header({ 
  profile, 
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismissNotification,
  onSignOut, 
  onManageSubscription 
}: HeaderProps) {
  const subscription = useSubscription(profile);

  const getPlanBadge = () => {
    if (subscription.isTrialActive) {
      return (
        <Badge variant="secondary" className="gap-1 text-[10px] px-2 py-0.5">
          <Sparkles className="w-3 h-3" />
          Trial · {subscription.daysRemaining}d left
        </Badge>
      );
    }
    
    const planLabels: Record<string, string> = {
      starter: 'Starter',
      business: 'Business',
      pro: 'Pro',
    };
    
    const planLabel = planLabels[subscription.plan];
    if (planLabel && subscription.isActive) {
      return (
        <Badge className="gap-1 text-[10px] px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 border-0 text-white">
          <Crown className="w-3 h-3" />
          {planLabel}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
        Free
      </Badge>
    );
  };

  const getExpiryDate = () => {
    if (subscription.isTrialActive && profile.trialEndsAt) {
      return format(new Date(profile.trialEndsAt), 'MMM d, yyyy');
    }
    if (subscription.isActive && profile.subscriptionEndsAt) {
      return format(new Date(profile.subscriptionEndsAt), 'MMM d, yyyy');
    }
    return null;
  };

  const expiryDate = getExpiryDate();

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border safe-area-pt">
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 max-w-4xl mx-auto">
        {/* Business Logo & Info */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {profile.logoUrl ? (
                <button className="w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-border">
                  <img 
                    src={profile.logoUrl} 
                    alt={profile.businessName}
                    className="w-full h-full object-cover"
                  />
                </button>
              ) : (
                <button className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity">
                  {profile.businessName.charAt(0)}
                </button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover border border-border shadow-lg z-50">
              <DropdownMenuItem onClick={onManageSubscription} className="cursor-pointer">
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Subscription
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground truncate max-w-[120px] sm:max-w-none">
                {profile.businessName}
              </span>
              {getPlanBadge()}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs text-muted-foreground truncate">
                {profile.kraPin}
              </span>
              {expiryDate && (
                <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {expiryDate}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <NotificationPanel
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onDismiss={onDismissNotification}
          />
        </div>
      </div>
    </header>
  );
}
