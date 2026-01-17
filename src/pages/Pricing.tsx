import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Star, Zap, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PaymentCheckout } from '@/components/payment/PaymentCheckout';
import { toast } from 'sonner';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 500,
    annualPrice: 417,
    description: 'Perfect for sole traders',
    icon: Zap,
    features: [
      'Record unlimited transactions',
      'Basic expense tracking',
      'Simple invoicing',
      'Mobile friendly',
      'Email support',
    ],
    highlighted: false,
  },
  {
    id: 'business',
    name: 'Business',
    price: 1200,
    annualPrice: 1000,
    description: 'For VAT-registered SMEs',
    icon: Building2,
    features: [
      'Everything in Starter',
      'VAT calculations & reports',
      'Inventory management',
      'PDF invoice generation',
      'KRA deadline reminders',
      'Priority support',
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 2000,
    annualPrice: 1667,
    description: 'For SMEs & accountants',
    icon: Star,
    features: [
      'Everything in Business',
      'Multi-business support',
      'Advanced analytics',
      'Custom branding on invoices',
      'API access',
      'Dedicated account manager',
    ],
    highlighted: false,
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setCurrentPlan(data.subscription_plan);
        }
      }
    };
    fetchCurrentPlan();
  }, [user]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (currentPlan === plan.id) {
      toast.info('You are already subscribed to this plan');
      return;
    }

    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = async () => {
    if (!user || !selectedPlan) return;

    try {
      // Update user's subscription in the database
      const subscriptionEndsAt = new Date();
      if (isAnnual) {
        subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1);
      } else {
        subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: selectedPlan.id as 'starter' | 'business' | 'pro',
          subscription_status: 'active',
          subscription_ends_at: subscriptionEndsAt.toISOString(),
          trial_ends_at: null, // Clear trial when they subscribe
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(`Successfully upgraded to ${selectedPlan.name} plan!`);
      setCurrentPlan(selectedPlan.id);
      setShowCheckout(false);
      setSelectedPlan(null);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription. Please contact support.');
    }
  };

  const getButtonText = (plan: typeof plans[0]) => {
    if (!user) return 'Start Free Trial';
    if (currentPlan === plan.id) return 'Current Plan';
    if (currentPlan === 'pro') return 'Current Plan';
    if (currentPlan === 'business' && plan.id === 'starter') return 'Downgrade';
    return 'Upgrade Now';
  };

  const isCurrentOrLowerPlan = (plan: typeof plans[0]) => {
    if (!currentPlan || currentPlan === 'free_trial') return false;
    const planOrder = ['starter', 'business', 'pro'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const planIndex = planOrder.indexOf(plan.id);
    return planIndex <= currentIndex;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
              B
            </div>
            <span className="font-bold text-lg hidden sm:inline">Biashara Books</span>
          </div>
          {user ? (
            <Button variant="outline" onClick={() => navigate('/')}>
              Dashboard
            </Button>
          ) : (
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          {user && currentPlan === 'free_trial' && (
            <Badge className="mb-4 bg-warning/20 text-warning border-warning/30">
              🎯 You're on a Free Trial
            </Badge>
          )}
          {!user && (
            <Badge className="mb-4 bg-success/20 text-success border-success/30">
              🎉 14-Day Free Trial
            </Badge>
          )}
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {user ? 'Upgrade Your Plan' : 'Simple, Transparent Pricing'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {user 
              ? 'Choose the plan that fits your business needs. Upgrade instantly with M-Pesa or card.'
              : 'Choose the plan that fits your business. All plans include a 14-day free trial. No credit card required.'}
          </p>

          {/* Annual Toggle */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Label htmlFor="annual" className={cn(!isAnnual && "text-foreground font-medium")}>
              Monthly
            </Label>
            <Switch
              id="annual"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="annual" className={cn(isAnnual && "text-foreground font-medium")}>
              Annual
              <Badge variant="secondary" className="ml-2 bg-success/20 text-success">
                Save 17%
              </Badge>
            </Label>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const displayPrice = isAnnual ? plan.annualPrice : plan.price;
            const isCurrentPlan = currentPlan === plan.id;

            return (
              <Card
                key={plan.name}
                className={cn(
                  "relative transition-all duration-300 hover:shadow-lg",
                  plan.highlighted && "border-primary shadow-lg scale-105 z-10",
                  isCurrentPlan && "ring-2 ring-success"
                )}
              >
                {plan.badge && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-success text-success-foreground px-4">
                      Current Plan
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center",
                    plan.highlighted ? "gradient-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(displayPrice)}
                    </span>
                    <span className="text-muted-foreground">
                      / month
                    </span>
                    {isAnnual && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed annually (pay 10 months, get 12)
                      </p>
                    )}
                  </div>
                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "secondary" : plan.highlighted ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentOrLowerPlan(plan)}
                  >
                    {getButtonText(plan)}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="text-center space-y-6">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              14-day free trial
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              Cancel anytime
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              M-Pesa payments accepted
            </div>
          </div>

          <p className="text-muted-foreground">
            Questions? Contact us at{' '}
            <a href="mailto:support@biasharabooks.co.ke" className="text-primary hover:underline">
              support@biasharabooks.co.ke
            </a>
          </p>
        </div>
      </main>

      {/* Payment Checkout Modal */}
      {selectedPlan && (
        <PaymentCheckout
          isOpen={showCheckout}
          onClose={() => {
            setShowCheckout(false);
            setSelectedPlan(null);
          }}
          plan={{
            name: selectedPlan.name,
            price: isAnnual ? selectedPlan.annualPrice : selectedPlan.price,
            isAnnual,
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
