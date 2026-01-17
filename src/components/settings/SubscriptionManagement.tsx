import { useState, useEffect } from 'react';
import { ArrowLeft, Check, Crown, Sparkles, ArrowUp, ArrowDown, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BusinessProfile } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PaymentCheckout } from '@/components/payment/PaymentCheckout';

interface PricingPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  features: string[];
  is_active: boolean;
  is_highlighted: boolean;
  badge: string | null;
  sort_order: number;
}

interface SubscriptionManagementProps {
  profile: BusinessProfile;
  onUpdateProfile: (updates: Partial<BusinessProfile>) => void;
  onBack: () => void;
}

export function SubscriptionManagement({ profile, onUpdateProfile, onBack }: SubscriptionManagementProps) {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [paymentCheckoutOpen, setPaymentCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const currentPlan = profile.subscriptionPlan || 'free_trial';
  const isActive = profile.subscriptionStatus === 'active';

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const parsedPlans: PricingPlan[] = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) 
          ? (plan.features as unknown[]).map(f => String(f))
          : [],
      }));

      setPlans(parsedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const getPlanIndex = (planKey: string) => {
    return plans.findIndex(p => p.plan_key === planKey);
  };

  const isUpgrade = (targetPlan: PricingPlan) => {
    const currentIndex = getPlanIndex(currentPlan);
    const targetIndex = getPlanIndex(targetPlan.plan_key);
    return targetIndex > currentIndex;
  };

  const handlePlanSelect = (plan: PricingPlan) => {
    if (plan.plan_key === currentPlan) return;
    setSelectedPlan(plan);
    
    // If upgrading, go directly to payment checkout
    if (isUpgrade(plan)) {
      setPaymentCheckoutOpen(true);
    } else {
      // For downgrades, show confirmation dialog first
      setConfirmDialogOpen(true);
    }
  };

  const handleDowngrade = async () => {
    if (!selectedPlan) return;

    setProcessing(true);
    try {
      // Calculate subscription end date (30 days for monthly, 365 for annual)
      const daysToAdd = billingPeriod === 'monthly' ? 30 : 365;
      const subscriptionEndsAt = new Date();
      subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + daysToAdd);

      // Update the profile with new subscription details
      type SubscriptionPlanEnum = 'free_trial' | 'starter' | 'business' | 'pro';
      const planKey = selectedPlan.plan_key as SubscriptionPlanEnum;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: planKey,
          subscription_status: 'active',
          subscription_ends_at: subscriptionEndsAt.toISOString(),
        })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      // Update local state
      type SubscriptionPlanType = 'free_trial' | 'starter' | 'business' | 'pro';
      onUpdateProfile({
        subscriptionPlan: selectedPlan.plan_key as SubscriptionPlanType,
        subscriptionStatus: 'active',
        subscriptionEndsAt: subscriptionEndsAt.toISOString(),
      });

      toast.success(`Switched to ${selectedPlan.name} plan`);

      setConfirmDialogOpen(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Error changing plan:', error);
      toast.error('Failed to change subscription plan');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!selectedPlan) return;
    
    // Calculate subscription end date
    const daysToAdd = billingPeriod === 'monthly' ? 30 : 365;
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + daysToAdd);

    type SubscriptionPlanType = 'free_trial' | 'starter' | 'business' | 'pro';
    onUpdateProfile({
      subscriptionPlan: selectedPlan.plan_key as SubscriptionPlanType,
      subscriptionStatus: 'active',
      subscriptionEndsAt: subscriptionEndsAt.toISOString(),
    });

    // Send subscription upgrade email
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.functions.invoke('send-subscription-email', {
          body: {
            userId: user.id,
            planName: selectedPlan.name,
            planKey: selectedPlan.plan_key,
            billingPeriod,
            price: billingPeriod === 'monthly' ? selectedPlan.monthly_price : selectedPlan.annual_price,
            features: selectedPlan.features,
          }
        });
        console.log('Subscription email sent successfully');
      }
    } catch (emailError) {
      console.error('Failed to send subscription email:', emailError);
      // Don't block the success flow if email fails
    }

    toast.success(`Successfully upgraded to ${selectedPlan.name}!`);
    setPaymentCheckoutOpen(false);
    setSelectedPlan(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground">Upgrade or change your plan</p>
        </div>
      </div>

      {/* Current Plan Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Current Plan: <span className="capitalize">{currentPlan.replace('_', ' ')}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive ? (
                    profile.subscriptionEndsAt 
                      ? `Renews ${new Date(profile.subscriptionEndsAt).toLocaleDateString()}`
                      : 'Active subscription'
                  ) : (
                    profile.trialEndsAt 
                      ? `Trial ends ${new Date(profile.trialEndsAt).toLocaleDateString()}`
                      : 'Free trial'
                  )}
                </p>
              </div>
            </div>
            {isActive && (
              <Badge variant="default" className="bg-success text-success-foreground">
                Active
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing Period Toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center rounded-lg bg-muted p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors",
              billingPeriod === 'monthly'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2",
              billingPeriod === 'annual'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Annual
            <Badge variant="secondary" className="text-xs">Save 17%</Badge>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="space-y-4">
        {plans.map((plan) => {
          const isCurrent = plan.plan_key === currentPlan;
          const upgrading = !isCurrent && isUpgrade(plan);
          const downgrading = !isCurrent && !upgrading;
          const price = billingPeriod === 'monthly' ? plan.monthly_price : plan.annual_price;

          return (
            <Card 
              key={plan.id}
              className={cn(
                "relative overflow-hidden transition-all",
                plan.is_highlighted && "border-primary shadow-lg",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {plan.badge && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-0 left-0">
                  <Badge className="rounded-none rounded-br-lg bg-success text-success-foreground">
                    Current Plan
                  </Badge>
                </div>
              )}
              <CardHeader className={cn(isCurrent && "pt-8")}>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {plan.name}
                      {plan.plan_key === 'pro' && <Sparkles className="h-4 w-4 text-yellow-500" />}
                    </CardTitle>
                    {plan.description && (
                      <CardDescription className="mt-1">{plan.description}</CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {formatPrice(price)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  className="w-full"
                  variant={isCurrent ? "outline" : upgrading ? "default" : "secondary"}
                  disabled={isCurrent}
                  onClick={() => handlePlanSelect(plan)}
                >
                  {isCurrent ? (
                    "Current Plan"
                  ) : upgrading ? (
                    <>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Upgrade to {plan.name}
                    </>
                  ) : (
                    <>
                      <ArrowDown className="h-4 w-4 mr-2" />
                      Downgrade to {plan.name}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog - Only for downgrades */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Downgrade Plan</DialogTitle>
            <DialogDescription>
              You're about to switch to the {selectedPlan?.name} plan.
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div>
                  <p className="font-medium">{selectedPlan.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {billingPeriod === 'monthly' ? 'Monthly billing' : 'Annual billing'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatPrice(billingPeriod === 'monthly' ? selectedPlan.monthly_price : selectedPlan.annual_price)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    /{billingPeriod === 'monthly' ? 'month' : 'year'}
                  </p>
                </div>
              </div>

              {!isUpgrade(selectedPlan) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Downgrade Notice</AlertTitle>
                  <AlertDescription>
                    Downgrading may result in losing access to some features. Your current subscription will remain active until the end of your billing period.
                  </AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground">
                <p>• Your new plan will be activated immediately</p>
                <p>• This change will take effect at the end of your current billing period</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={handleDowngrade} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Downgrade'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Checkout for Upgrades */}
      {selectedPlan && (
        <PaymentCheckout
          isOpen={paymentCheckoutOpen}
          onClose={() => {
            setPaymentCheckoutOpen(false);
            setSelectedPlan(null);
          }}
          plan={{
            name: selectedPlan.name,
            price: billingPeriod === 'monthly' ? selectedPlan.monthly_price : selectedPlan.annual_price,
            isAnnual: billingPeriod === 'annual',
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
