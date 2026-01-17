import { useState } from 'react';
import { Search, User, Star, Gift, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoyaltyCustomer } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LoyaltyLookupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: LoyaltyCustomer | null) => void;
  selectedCustomer: LoyaltyCustomer | null;
  cartTotal: number;
  onRedeemPoints?: (points: number) => void;
}

// Points earned per 100 KES spent
const POINTS_PER_100 = 1;
// Points required for 100 KES discount
const POINTS_FOR_DISCOUNT = 100;
const DISCOUNT_VALUE = 100;

export function LoyaltyLookup({ 
  isOpen, 
  onClose, 
  onSelectCustomer, 
  selectedCustomer,
  cartTotal,
  onRedeemPoints 
}: LoyaltyLookupProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<LoyaltyCustomer | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  const handleSearch = async () => {
    if (!phone || phone.length < 10 || !user) return;
    
    setIsSearching(true);
    setFoundCustomer(null);
    setShowCreateForm(false);

    try {
      const { data, error } = await supabase
        .from('loyalty_customers')
        .select('*')
        .eq('user_id', user.id)
        .eq('phone', phone)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const customer: LoyaltyCustomer = {
          id: data.id,
          phone: data.phone,
          name: data.name || undefined,
          pointsBalance: data.points_balance,
          totalPointsEarned: data.total_points_earned,
          totalPointsRedeemed: data.total_points_redeemed,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
        setFoundCustomer(customer);
        setName(customer.name || '');
      } else {
        setShowCreateForm(true);
        toast.info('Customer not found. Create new?');
      }
    } catch (error) {
      console.error('Loyalty lookup error:', error);
      toast.error('Failed to search customer');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async () => {
    if (!phone || !user) return;

    try {
      const { data, error } = await supabase
        .from('loyalty_customers')
        .insert({
          user_id: user.id,
          phone,
          name: name || null,
        })
        .select()
        .single();

      if (error) throw error;

      const customer: LoyaltyCustomer = {
        id: data.id,
        phone: data.phone,
        name: data.name || undefined,
        pointsBalance: data.points_balance,
        totalPointsEarned: data.total_points_earned,
        totalPointsRedeemed: data.total_points_redeemed,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setFoundCustomer(customer);
      setShowCreateForm(false);
      toast.success('Customer created!');
    } catch (error) {
      console.error('Create customer error:', error);
      toast.error('Failed to create customer');
    }
  };

  const handleSelect = () => {
    onSelectCustomer(foundCustomer);
    if (pointsToRedeem > 0 && onRedeemPoints) {
      onRedeemPoints(pointsToRedeem);
    }
    onClose();
  };

  const handleClear = () => {
    onSelectCustomer(null);
    setFoundCustomer(null);
    setPhone('');
    setName('');
    setPointsToRedeem(0);
    setShowCreateForm(false);
    onClose();
  };

  const pointsToEarn = Math.floor(cartTotal / 100) * POINTS_PER_100;
  const maxRedeemable = foundCustomer 
    ? Math.min(
        foundCustomer.pointsBalance,
        Math.floor(cartTotal / DISCOUNT_VALUE) * POINTS_FOR_DISCOUNT
      )
    : 0;
  const discountFromPoints = Math.floor(pointsToRedeem / POINTS_FOR_DISCOUNT) * DISCOUNT_VALUE;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Loyalty Program
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Phone Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="phone" className="sr-only">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching || phone.length < 10}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Create New Customer Form */}
          {showCreateForm && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">New Customer</p>
                <div>
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="Customer name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Customer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Found Customer */}
          {foundCustomer && (
            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{foundCustomer.name || foundCustomer.phone}</p>
                    <p className="text-sm text-muted-foreground">{foundCustomer.phone}</p>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                    <Star className="h-3 w-3 mr-1" />
                    {foundCustomer.pointsBalance} pts
                  </Badge>
                </div>

                {/* Points Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded bg-background">
                    <p className="text-muted-foreground">Will Earn</p>
                    <p className="font-bold text-success">+{pointsToEarn} points</p>
                  </div>
                  <div className="p-2 rounded bg-background">
                    <p className="text-muted-foreground">Available</p>
                    <p className="font-bold">{foundCustomer.pointsBalance} points</p>
                  </div>
                </div>

                {/* Redeem Points */}
                {foundCustomer.pointsBalance >= POINTS_FOR_DISCOUNT && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">Redeem Points</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {POINTS_FOR_DISCOUNT} points = KES {DISCOUNT_VALUE} discount
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Points to redeem"
                        value={pointsToRedeem || ''}
                        onChange={(e) => setPointsToRedeem(Math.min(Number(e.target.value), maxRedeemable))}
                        max={maxRedeemable}
                        min={0}
                        step={POINTS_FOR_DISCOUNT}
                        className="h-8"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPointsToRedeem(maxRedeemable)}
                      >
                        Max
                      </Button>
                    </div>
                    {pointsToRedeem > 0 && (
                      <p className="text-sm font-medium text-success mt-2">
                        Discount: -{formatKES(discountFromPoints)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Currently Selected */}
          {selectedCustomer && !foundCustomer && (
            <Card className="border-muted">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedCustomer.name || selectedCustomer.phone}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Clear
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClear}>
            Clear Customer
          </Button>
          <Button onClick={handleSelect} disabled={!foundCustomer}>
            {foundCustomer ? 'Apply to Sale' : 'Select Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatKES(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
}
