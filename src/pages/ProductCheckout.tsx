import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, CreditCard, Smartphone, Loader2, CheckCircle2, ShoppingBag, ChevronLeft, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatKES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ProductDetail {
  id: string;
  name: string;
  unit_price: number;
  image_url: string | null;
  quantity: number;
}

interface ProductImage {
  image_url: string;
}

type PaymentMethod = 'mpesa' | 'card';

export default function ProductCheckout() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [appName, setAppName] = useState('KRA ASSIST');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const qty = parseInt(searchParams.get('qty') || '1', 10);
    if (qty > 0) setQuantity(qty);

    const fetchData = async () => {
      if (!id) return;
      
      try {
        // Fetch app settings
        const { data: logoData } = await supabase.rpc('get_app_setting', { setting_key: 'app_logo' });
        const { data: nameData } = await supabase.rpc('get_app_setting', { setting_key: 'app_name' });
        
        if (logoData) setAppLogo(logoData);
        if (nameData) setAppName(nameData);

        // Fetch product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, name, unit_price, image_url, quantity')
          .eq('id', id)
          .eq('is_public', true)
          .single();

        if (productError) throw productError;

        // Fetch primary image
        const { data: images } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', id)
          .order('sort_order', { ascending: true })
          .limit(1);

        setProduct(productData);
        setProductImage(images?.[0]?.image_url || productData.image_url);

        // Pre-fill user email if logged in
        if (user?.email) {
          setCustomerEmail(user.email);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        navigate('/catalog');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, searchParams, navigate, user]);

  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) {
      return '254' + digits.slice(1);
    } else if (digits.startsWith('254')) {
      return digits;
    } else if (digits.startsWith('+254')) {
      return digits.slice(1);
    }
    return '254' + digits;
  };

  const validateForm = () => {
    if (!customerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (!customerPhone.trim() || customerPhone.length < 9) {
      toast.error('Please enter a valid phone number');
      return false;
    }
    if (paymentMethod === 'mpesa' && (!phoneNumber || phoneNumber.length < 9)) {
      toast.error('Please enter a valid M-Pesa phone number');
      return false;
    }
    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvc || !cardName)) {
      toast.error('Please fill in all card details');
      return false;
    }
    return true;
  };

  const handleMpesaPayment = async () => {
    if (!product) return;

    setProcessing(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const totalAmount = product.unit_price * quantity;
      
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: formattedPhone,
          amount: totalAmount,
          accountReference: `PROD-${product.id.slice(0, 8)}`,
          transactionDesc: `Purchase: ${product.name} x${quantity}`
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('M-Pesa payment request sent! Check your phone to complete payment.');
        setPaymentSuccess(true);
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
    if (!product) return;

    setProcessing(true);
    try {
      const totalAmount = product.unit_price * quantity;
      const reference = `PROD_${product.id}_${Date.now()}`;
      
      const { data, error } = await supabase.functions.invoke('paystack-payment', {
        body: {
          action: 'initiate_payment',
          userId: user?.id,
          amount: totalAmount,
          currency: 'KES',
          description: `Purchase: ${product.name} x${quantity}`,
          reference,
          customerEmail: customerEmail,
          callbackUrl: `${window.location.origin}/payment-callback`,
        }
      });

      if (error) throw error;

      if (data?.success || data?.redirectUrl) {
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          toast.success('Payment successful!');
          setPaymentSuccess(true);
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
    if (!validateForm()) return;
    
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
          <Button onClick={() => navigate('/catalog')}>Back to Catalog</Button>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Payment Initiated!</h2>
            <p className="text-muted-foreground">
              {paymentMethod === 'mpesa' 
                ? 'Please check your phone and enter your M-Pesa PIN to complete the payment.'
                : 'Your payment has been processed successfully.'}
            </p>
            <div className="pt-4 space-y-2">
              <Button className="w-full" onClick={() => navigate('/catalog')}>
                Continue Shopping
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/contact')}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = product.unit_price * quantity;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/home" className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt={appName} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-lg">{appName}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/product/${product.id}`)} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Product
        </Button>
      </div>

      {/* Checkout Content */}
      <main className="max-w-4xl mx-auto px-4 pb-12">
        <h1 className="text-2xl font-bold text-foreground mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                {/* M-Pesa Form */}
                {paymentMethod === 'mpesa' && (
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
                    <Input
                      id="mpesa-phone"
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
                )}

                {/* Card Form */}
                {paymentMethod === 'card' && (
                  <div className="p-4 bg-muted/30 rounded-lg space-y-4">
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
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product */}
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">Qty: {quantity}</p>
                    <p className="text-sm font-medium text-primary">{formatKES(product.unit_price)}</p>
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatKES(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className="font-medium text-success">Free</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">{formatKES(totalAmount)}</span>
                </div>

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
                    <>Pay {formatKES(totalAmount)}</>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By completing this purchase, you agree to our Terms of Service.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
