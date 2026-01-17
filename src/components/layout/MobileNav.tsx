import { Home, ShoppingCart, FileText, Settings, Shield, Package, MoreHorizontal, Receipt, Calculator, Users, BarChart3, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
}

const mainNavItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'inventory', label: 'Stock', icon: Package },
];

const moreNavItems = [
  { id: 'transactions', label: 'Transactions', icon: Receipt },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reports', label: 'VAT Report', icon: Calculator },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'pos-reports', label: 'POS Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const adminItem = { id: 'admin', label: 'Admin', icon: Shield };

export function MobileNav({ activeTab, onTabChange, isAdmin }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const allMoreItems = isAdmin ? [...moreNavItems, adminItem] : moreNavItems;
  const isMoreActive = allMoreItems.some(item => item.id === activeTab);
  
  const handleItemClick = (id: string) => {
    onTabChange(id);
    setMoreOpen(false);
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg safe-area-pb">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-200 min-w-0 flex-1",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "w-5 h-5 transition-transform",
                  isActive && "scale-110"
                )} />
              </div>
              <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
        
        {/* More Menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-lg transition-all duration-200 min-w-0 flex-1",
                isMoreActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isMoreActive && "bg-primary/10"
              )}>
                <MoreHorizontal className={cn(
                  "w-5 h-5 transition-transform",
                  isMoreActive && "scale-110"
                )} />
              </div>
              <span className="text-[10px] font-medium truncate max-w-full">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="text-left">More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {allMoreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-muted active:scale-95"
                    )}
                  >
                    <div className={cn(
                      "p-2.5 rounded-xl transition-colors",
                      isActive ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
