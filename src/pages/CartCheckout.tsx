import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatKES } from '@/lib/constants';
import { toast } from 'sonner';
import { ArrowLeft, CreditCard, Phone, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type PaymentMethod = 'mpesa' | 'card';

export default function CartCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalAmount, clearCart } = useCart();
  const [appName, setAppName] = useState('KRA ASSIST');
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchAppName = async () => {
      const { data } = await supabase.rpc('get_app_setting', { setting_key: 'app_name' });
      if (data) setAppName(data);
    };
    fetchAppName();
  }, []);

  useEffect(() => {
    if (user?.email) {
      setCustomerEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (items.length === 0 && !paymentSuccess) {
      navigate('/cart');
    }
  }, [items, paymentSuccess, navigate]);

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('+')) {
      cleaned = cleaned.slice(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (!customerPhone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }
    if (paymentMethod === 'mpesa' && !mpesaPhone.trim()) {
      toast.error('Please enter M-Pesa phone number');
      return false;
    }
    return true;
  };

  const handleMpesaPayment = async () => {
    const formattedPhone = formatPhoneNumber(mpesaPhone);
    
    const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
      body: {
        phone: formattedPhone,
        amount: Math.round(totalAmount),
        orderId: `CART-${Date.now()}`,
        description: `Cart Order: ${items.length} items`,
      },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Payment initiation failed');

    toast.success('M-Pesa payment request sent! Check your phone.');
    setPaymentSuccess(true);
    clearCart();
  };

  const handleCardPayment = async () => {
    const { data, error } = await supabase.functions.invoke('paystack-payment', {
      body: {
        email: customerEmail,
        amount: Math.round(totalAmount * 100), // Paystack expects kobo/cents
        currency: 'KES',
        reference: `CART-${Date.now()}`,
        callback_url: window.location.origin + '/cart',
        metadata: {
          customer_name: customerName,
          customer_phone: customerPhone,
          items: items.map(i => ({ id: i.id, name: i.name, quantity: i.quantity })),
        },
      },
    });

    if (error) throw error;
    if (!data?.authorization_url) throw new Error('Failed to get payment URL');

    clearCart();
    window.location.href = data.authorization_url;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;
    
    setIsProcessing(true);
    try {
      if (paymentMethod === 'mpesa') {
        await handleMpesaPayment();
      } else {
        await handleCardPayment();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <PublicNavbar />
        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">Payment Initiated!</h1>
          <p className="text-muted-foreground mb-8">
            Please complete the M-Pesa payment on your phone. You will receive a confirmation shortly.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/catalog')}>Continue Shopping</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Go to Home</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/cart')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0712345678"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      paymentMethod === 'mpesa'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Phone className="h-6 w-6" />
                    <span className="font-medium">M-Pesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                      paymentMethod === 'card'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="font-medium">Card</span>
                  </button>
                </div>

                {paymentMethod === 'mpesa' && (
                  <div>
                    <Label htmlFor="mpesa-phone">M-Pesa Phone Number *</Label>
                    <Input
                      id="mpesa-phone"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="0712345678"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      You will receive an STK push on this number
                    </p>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to a secure payment page to complete your purchase.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="text-sm font-medium">{formatKES(item.unit_price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatKES(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{formatKES(totalAmount)}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : `Pay ${formatKES(totalAmount)}`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
