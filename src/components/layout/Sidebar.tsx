import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, BarChart3, Settings, LogOut, List, Package, Crown, CreditCard, FileCheck, Receipt, ShoppingCart, Users, UserCog, TrendingUp, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BusinessProfile } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  profile: BusinessProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'pos-reports', label: 'POS Reports', icon: TrendingUp },
  { id: 'transactions', label: 'Transactions', icon: List },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'cashiers', label: 'Cashiers', icon: UserCog },
  { id: 'reports', label: 'VAT Report', icon: BarChart3 },
  { id: 'kra-filing', label: 'KRA Filing', icon: FileCheck },
  { id: 'billing', label: 'Billing History', icon: Receipt },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ profile, activeTab, onTabChange, onSignOut }: SidebarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
      {/* Company Logo/Brand */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-border">
        {profile.logoUrl ? (
          <img 
            src={profile.logoUrl} 
            alt={profile.businessName} 
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold">
            {profile.businessName.charAt(0)}
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <span className="font-semibold text-sm text-foreground truncate">
            {profile.businessName}
          </span>
          <span className="text-xs text-muted-foreground">
            {profile.kraPin}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </button>
          );
        })}

        {/* Admin Link */}
        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 mt-4",
              "text-warning hover:bg-warning/10"
            )}
          >
            <Crown className="w-5 h-5" />
            Admin Panel
          </button>
        )}
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onSignOut}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}