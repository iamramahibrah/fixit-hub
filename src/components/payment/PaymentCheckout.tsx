import { useState } from 'react';
import { CreditCard, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PaymentCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    name: string;
    price: number;
    isAnnual: boolean;
  };
  onSuccess: () => void;
}

type PaymentMethod = 'mpesa' | 'card';

export function PaymentCheckout({ isOpen, onClose, plan, onSuccess }: PaymentCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const totalAmount = plan.isAnnual ? plan.price * 10 : plan.price;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (digits.startsWith('0')) {
      return '254' + digits.slice(1);
    } else if (digits.startsWith('254')) {
      return digits;
    } else if (digits.startsWith('+254')) {
      return digits.slice(1);
    }
    return '254' + digits;
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessing(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: formattedPhone,
          amount: totalAmount,
          accountReference: `SUB-${plan.name.toUpperCase()}`,
          transactionDesc: `${plan.name} Plan - ${plan.isAnnual ? 'Annual' : 'Monthly'} Subscription`
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('M-Pesa payment request sent! Check your phone to complete payment.');
        // Poll for payment status or show pending state
        setPaymentSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      } else {
        throw new Error(data?.message || 'Payment initiation failed');
      }
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      toast.error(error.message || 'Failed to initiate M-Pesa payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      toast.error('Please fill in all card details');
      return;
    }

    setProcessing(true);
    try {
      // For card payments, we use Paystack
      const { data: { user } } = await supabase.auth.getUser();
      const reference = `SUB_${user?.id}_${plan.name.toLowerCase()}_${Date.now()}`;
      
      const { data, error } = await supabase.functions.invoke('paystack-payment', {
        body: {
          action: 'initiate_payment',
          userId: user?.id,
          amount: totalAmount,
          currency: 'KES',
          description: `${plan.name} Plan - ${plan.isAnnual ? 'Annual' : 'Monthly'} Subscription`,
          reference,
          customerEmail: user?.email,
          callbackUrl: `${window.location.origin}/payment-callback`,
        }
      });

      if (error) throw error;

      if (data?.success || data?.redirectUrl) {
        if (data.redirectUrl) {
          // Redirect to Paystack payment page
          window.location.href = data.redirectUrl;
        } else {
          toast.success('Payment successful!');
          setPaymentSuccess(true);
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        }
      } else {
        throw new Error(data?.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Card payment error:', error);
      toast.error(error.message || 'Failed to process card payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    if (paymentMethod === 'mpesa') {
      handleMpesaPayment();
    } else {
      handleCardPayment();
    }
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ').slice(0, 19) : '';
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2, 4);
    }
    return digits;
  };

  if (paymentSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Payment Successful!</h3>
            <p className="text-muted-foreground text-center">
              Your {plan.name} plan is now active. Enjoy your premium features!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.name}</DialogTitle>
          <DialogDescription>
            {plan.isAnnual ? 'Annual' : 'Monthly'} subscription - {formatPrice(totalAmount)}
            {plan.isAnnual && ' (billed annually)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="mpesa"
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all",
                  paymentMethod === 'mpesa' 
                    ? "border-success bg-success/5 ring-2 ring-success/20" 
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <RadioGroupItem value="mpesa" id="mpesa" className="sr-only" />
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-foreground">M-Pesa</p>
                  <p className="text-xs text-muted-foreground">Pay via STK Push</p>
                </div>
              </Label>
              <Label
                htmlFor="card"
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all",
                  paymentMethod === 'card' 
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <RadioGroupItem value="card" id="card" className="sr-only" />
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Card</p>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* M-Pesa Form */}
          {paymentMethod === 'mpesa' && (
            <Card className="p-4 bg-muted/30">
              <div className="space-y-3">
                <Label htmlFor="phone">M-Pesa Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  You'll receive an STK push on this number to complete the payment
                </p>
              </div>
            </Card>
          )}

          {/* Card Form */}
          {paymentMethod === 'card' && (
            <Card className="p-4 bg-muted/30">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardName">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    placeholder="John Doe"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      maxLength={5}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      placeholder="123"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      maxLength={4}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Order Summary */}
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{plan.name} Plan ({plan.isAnnual ? 'Annual' : 'Monthly'})</span>
                <span className="font-medium">{formatPrice(plan.price)}/mo</span>
              </div>
              {plan.isAnnual && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Billed annually (10 months)</span>
                  <span className="font-medium">{formatPrice(totalAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Pay Button */}
          <Button 
            onClick={handlePayment} 
            className="w-full" 
            size="lg"
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay {formatPrice(totalAmount)}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By subscribing, you agree to our Terms of Service and Privacy Policy.
            You can cancel your subscription at any time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
