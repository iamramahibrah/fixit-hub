import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Plus, Minus, Trash2, ShoppingCart, Banknote, Smartphone, Package, X, Check, ScanBarcode, Star, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Product, BusinessProfile, LoyaltyCustomer } from '@/types';
import { formatKES, VAT_RATE } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BarcodeScanner } from './BarcodeScanner';
import { POSReceipt } from './POSReceipt';
import { LoyaltyLookup } from './LoyaltyLookup';

interface CartItem {
  product: Product;
  quantity: number;
}

interface PointOfSaleProps {
  products: Product[];
  profile: BusinessProfile;
  onBack: () => void;
  onSaleComplete: (saleData: {
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    vatAmount: number;
    total: number;
    paymentMethod: 'cash' | 'mpesa';
    customerPhone?: string;
    productUpdates: { productId: string; quantitySold: number }[];
    loyaltyCustomerId?: string;
    loyaltyPointsEarned?: number;
    loyaltyPointsRedeemed?: number;
    mpesaReceiptNumber?: string;
  }) => Promise<void>;
}

// Points earned per 100 KES spent
const POINTS_PER_100 = 1;
const POINTS_FOR_DISCOUNT = 100;
const DISCOUNT_VALUE = 100;

export function PointOfSale({ products, profile, onBack, onSaleComplete }: PointOfSaleProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState<'idle' | 'pending' | 'success' | 'failed' | 'cancelled'>('idle');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  
  // New feature states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState(false);
  const [loyaltyCustomer, setLoyaltyCustomer] = useState<LoyaltyCustomer | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<{
    items: { description: string; quantity: number; unitPrice: number; total: number }[];
    subtotal: number;
    vatAmount: number;
    total: number;
    paymentMethod: 'cash' | 'mpesa';
    cashReceived?: number;
    change?: number;
    loyaltyPointsEarned?: number;
    customerPhone?: string;
    mpesaReceiptNumber?: string;
  } | null>(null);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    );
  }, [products, search]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });
    return grouped;
  }, [filteredProducts]);

  // Calculate totals with loyalty discount
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.product.unitPrice * item.quantity), 0);
    const loyaltyDiscount = Math.floor(pointsToRedeem / POINTS_FOR_DISCOUNT) * DISCOUNT_VALUE;
    const discountedSubtotal = Math.max(0, subtotal - loyaltyDiscount);
    const vatAmount = profile.isVatRegistered ? discountedSubtotal * VAT_RATE : 0;
    const total = discountedSubtotal + vatAmount;
    const pointsToEarn = Math.floor(discountedSubtotal / 100) * POINTS_PER_100;
    return { subtotal, loyaltyDiscount, discountedSubtotal, vatAmount, total, pointsToEarn };
  }, [cart, profile.isVatRegistered, pointsToRedeem]);

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find(p => p.sku === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } else {
      toast.error(`Product not found: ${barcode}`);
    }
  };

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      toast.error('Out of stock');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error('Not enough stock');
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.quantity) {
          toast.error('Not enough stock');
          return item;
        }
        return { ...item, quantity: newQty };
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setLoyaltyCustomer(null);
    setPointsToRedeem(0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setIsCheckoutOpen(true);
    setMpesaStatus('idle');
    setCashReceived('');
    setCheckoutRequestId(null);
    setMpesaReceiptNumber(null);
    setPollingCount(0);
  };

  // Poll for M-Pesa payment status
  const pollPaymentStatus = async (requestId: string, attempt: number = 1) => {
    const maxAttempts = 12; // Poll for about 60 seconds (12 * 5 sec)
    
    if (attempt > maxAttempts) {
      setMpesaStatus('failed');
      toast.error('Payment verification timed out. Please check your phone.');
      setIsProcessing(false);
      return;
    }

    try {
      setPollingCount(attempt);
      
      const { data, error } = await supabase.functions.invoke('mpesa-query-status', {
        body: { 
          checkoutRequestId: requestId,
          expectedAmount: Math.ceil(cartTotals.total) // Send expected amount for verification
        }
      });

      if (error) {
        console.error('Status query error:', error);
        // Continue polling even on error
        setTimeout(() => pollPaymentStatus(requestId, attempt + 1), 5000);
        return;
      }

      console.log('Payment status:', data);

      if (data?.status === 'success') {
        setMpesaStatus('success');
        
        // Capture M-Pesa receipt number
        const receiptNumber = data.mpesaReceiptNumber || null;
        setMpesaReceiptNumber(receiptNumber);
        
        if (receiptNumber) {
          toast.success(`Payment received! Receipt: ${receiptNumber}`);
        } else {
          toast.success('Payment received successfully!');
        }
        
        // Verify amount matches
        if (data.transactionAmount && Math.abs(data.transactionAmount - cartTotals.total) > 1) {
          toast.warning(`Note: Paid amount (KES ${data.transactionAmount}) differs from total (KES ${Math.ceil(cartTotals.total)})`);
        }
        
        await completeSale('mpesa', receiptNumber);
      } else if (data?.status === 'cancelled') {
        setMpesaStatus('cancelled');
        toast.error('Payment was cancelled');
        setIsProcessing(false);
      } else if (data?.status === 'failed') {
        setMpesaStatus('failed');
        toast.error(data?.message || 'Payment failed');
        setIsProcessing(false);
      } else {
        // Still pending, poll again
        setTimeout(() => pollPaymentStatus(requestId, attempt + 1), 5000);
      }
    } catch (err) {
      console.error('Poll error:', err);
      setTimeout(() => pollPaymentStatus(requestId, attempt + 1), 5000);
    }
  };

  const processMpesaPayment = async () => {
    if (!customerPhone || customerPhone.length < 10) {
      toast.error('Enter valid phone number');
      return;
    }

    setIsProcessing(true);
    setMpesaStatus('pending');
    setPollingCount(0);

    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: customerPhone.startsWith('254') ? customerPhone : `254${customerPhone.replace(/^0/, '')}`,
          amount: Math.ceil(cartTotals.total),
          accountReference: `POS-${Date.now()}`,
          transactionDesc: 'POS Sale',
        }
      });

      if (error) throw error;

      if (data?.success && data?.checkoutRequestId) {
        setCheckoutRequestId(data.checkoutRequestId);
        toast.success('Check your phone for M-Pesa prompt');
        // Start polling for payment status
        setTimeout(() => pollPaymentStatus(data.checkoutRequestId, 1), 5000);
      } else {
        setMpesaStatus('failed');
        toast.error(data?.error || data?.message || 'M-Pesa payment failed');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('M-Pesa error:', error);
      setMpesaStatus('failed');
      toast.error('Failed to initiate M-Pesa payment');
      setIsProcessing(false);
    }
  };

  const completeSale = async (method: 'cash' | 'mpesa', receiptNumber?: string | null) => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      const items = cart.map(item => ({
        description: item.product.name,
        quantity: item.quantity,
        unitPrice: item.product.unitPrice,
        total: item.product.unitPrice * item.quantity,
      }));

      // Handle loyalty points
      let pointsEarned = 0;
      if (loyaltyCustomer) {
        pointsEarned = cartTotals.pointsToEarn;
        
        // Update loyalty customer points
        const newBalance = loyaltyCustomer.pointsBalance - pointsToRedeem + pointsEarned;
        await supabase
          .from('loyalty_customers')
          .update({
            points_balance: newBalance,
            total_points_earned: loyaltyCustomer.totalPointsEarned + pointsEarned,
            total_points_redeemed: loyaltyCustomer.totalPointsRedeemed + pointsToRedeem,
          })
          .eq('id', loyaltyCustomer.id);

        // Record earn transaction
        if (pointsEarned > 0) {
          await supabase.from('loyalty_transactions').insert({
            user_id: user.id,
            customer_id: loyaltyCustomer.id,
            type: 'earn',
            points: pointsEarned,
            sale_amount: cartTotals.total,
            description: `POS Sale - ${items.length} item(s)`,
          });
        }

        // Record redeem transaction
        if (pointsToRedeem > 0) {
          await supabase.from('loyalty_transactions').insert({
            user_id: user.id,
            customer_id: loyaltyCustomer.id,
            type: 'redeem',
            points: pointsToRedeem,
            description: `Redeemed for KES ${cartTotals.loyaltyDiscount} discount`,
          });
        }
      }

      const saleData = {
        items,
        subtotal: cartTotals.subtotal,
        vatAmount: cartTotals.vatAmount,
        total: cartTotals.total,
        paymentMethod: method,
        customerPhone: method === 'mpesa' ? customerPhone : (loyaltyCustomer?.phone || undefined),
        productUpdates: cart.map(item => ({
          productId: item.product.id,
          quantitySold: item.quantity,
        })),
        loyaltyCustomerId: loyaltyCustomer?.id,
        loyaltyPointsEarned: pointsEarned,
        loyaltyPointsRedeemed: pointsToRedeem,
        mpesaReceiptNumber: receiptNumber || mpesaReceiptNumber || undefined,
      };

      await onSaleComplete(saleData);
      
      // Prepare receipt data
      setLastSaleData({
        items,
        subtotal: cartTotals.subtotal,
        vatAmount: cartTotals.vatAmount,
        total: cartTotals.total,
        paymentMethod: method,
        cashReceived: method === 'cash' ? parseFloat(cashReceived) : undefined,
        change: method === 'cash' ? cashChange : undefined,
        loyaltyPointsEarned: pointsEarned,
        customerPhone: loyaltyCustomer?.phone || customerPhone || undefined,
        mpesaReceiptNumber: receiptNumber || mpesaReceiptNumber || undefined,
      });
      
      clearCart();
      setIsCheckoutOpen(false);
      setCustomerPhone('');
      setCashReceived('');
      setMpesaStatus('idle');
      setMpesaReceiptNumber(null);
      setShowReceipt(true);
      toast.success('Sale completed!');
    } catch (error) {
      console.error('Sale error:', error);
      toast.error('Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const cashChange = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    return received - cartTotals.total;
  }, [cashReceived, cartTotals.total]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Point of Sale</h1>
            <p className="text-sm text-muted-foreground">Quick sales terminal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setIsScannerOpen(true)}>
            <ScanBarcode className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsLoyaltyOpen(true)}
            className={cn(loyaltyCustomer && "border-yellow-500 bg-yellow-500/10")}
          >
            <Star className={cn("h-5 w-5", loyaltyCustomer && "text-yellow-500")} />
          </Button>
          {cart.length > 0 && (
            <Button onClick={handleCheckout} size="lg" className="gap-2">
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline">Checkout</span> ({formatKES(cartTotals.total)})
            </Button>
          )}
        </div>
      </div>

      {/* Loyalty Customer Badge */}
      {loyaltyCustomer && (
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{loyaltyCustomer.name || loyaltyCustomer.phone}</span>
              <Badge variant="secondary" className="bg-yellow-500/20">
                {loyaltyCustomer.pointsBalance} pts
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {cartTotals.loyaltyDiscount > 0 && (
                <Badge variant="destructive">-{formatKES(cartTotals.loyaltyDiscount)}</Badge>
              )}
              <span className="text-success">+{cartTotals.pointsToEarn} pts</span>
              <Button variant="ghost" size="sm" onClick={() => { setLoyaltyCustomer(null); setPointsToRedeem(0); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Product Grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products or scan barcode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
                  <ScanBarcode className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          {products.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No products in inventory</p>
                <p className="text-sm text-muted-foreground">Add products in Inventory first</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(productsByCategory).map(([category, prods]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{category}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {prods.map(product => {
                      const inCart = cart.find(c => c.product.id === product.id);
                      const isOutOfStock = product.quantity <= 0;
                      
                      return (
                        <Card
                          key={product.id}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md relative overflow-hidden",
                            isOutOfStock && "opacity-50 cursor-not-allowed",
                            inCart && "ring-2 ring-primary"
                          )}
                          onClick={() => !isOutOfStock && addToCart(product)}
                        >
                          {/* Product Image */}
                          {product.imageUrl ? (
                            <div className="aspect-square bg-muted">
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-square bg-muted flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                          <CardContent className="p-3">
                            <div className="flex flex-col gap-1">
                              <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                              <p className="text-primary font-bold">{formatKES(product.unitPrice)}</p>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "w-fit text-xs",
                                  isOutOfStock && "bg-destructive/20 text-destructive"
                                )}
                              >
                                {isOutOfStock ? 'Out of stock' : `${product.quantity} in stock`}
                              </Badge>
                            </div>
                            {inCart && (
                              <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                {inCart.quantity}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length})
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs">Tap products to add</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-2">
                        {item.product.imageUrl && (
                          <img 
                            src={item.product.imageUrl} 
                            alt="" 
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatKES(item.product.unitPrice)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="w-16 text-right font-medium text-sm">
                          {formatKES(item.product.unitPrice * item.quantity)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatKES(cartTotals.subtotal)}</span>
                    </div>
                    {cartTotals.loyaltyDiscount > 0 && (
                      <div className="flex justify-between text-success">
                        <span>Loyalty Discount</span>
                        <span>-{formatKES(cartTotals.loyaltyDiscount)}</span>
                      </div>
                    )}
                    {profile.isVatRegistered && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT (16%)</span>
                        <span>{formatKES(cartTotals.vatAmount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatKES(cartTotals.total)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setIsLoyaltyOpen(true)}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      {loyaltyCustomer ? 'Change Customer' : 'Add Loyalty Customer'}
                    </Button>
                    <Button className="w-full" size="lg" onClick={handleCheckout}>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Checkout
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Total */}
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="text-3xl font-bold text-primary">{formatKES(cartTotals.total)}</p>
              {loyaltyCustomer && cartTotals.pointsToEarn > 0 && (
                <p className="text-xs text-success mt-1">
                  +{cartTotals.pointsToEarn} loyalty points
                </p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => setPaymentMethod('cash')}
              >
                <Banknote className="h-6 w-6" />
                <span>Cash</span>
              </Button>
              <Button
                variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                className="h-16 flex-col gap-1"
                onClick={() => setPaymentMethod('mpesa')}
              >
                <Smartphone className="h-6 w-6" />
                <span>M-Pesa</span>
              </Button>
            </div>

            {/* Cash Payment */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cash">Cash Received (KES)</Label>
                  <Input
                    id="cash"
                    type="number"
                    placeholder="Enter amount received"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    autoFocus
                  />
                </div>
                {parseFloat(cashReceived) > 0 && (
                  <div className={cn(
                    "p-3 rounded-lg text-center",
                    cashChange >= 0 ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    <p className="text-sm text-muted-foreground">
                      {cashChange >= 0 ? 'Change Due' : 'Amount Short'}
                    </p>
                    <p className={cn(
                      "text-2xl font-bold",
                      cashChange >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {formatKES(Math.abs(cashChange))}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* M-Pesa Payment */}
            {paymentMethod === 'mpesa' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="phone">Customer Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., 0712345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    STK push will be sent to this number
                  </p>
                </div>

                {mpesaStatus !== 'idle' && (
                  <div className={cn(
                    "p-3 rounded-lg flex items-center gap-3",
                    mpesaStatus === 'pending' && "bg-warning/10",
                    mpesaStatus === 'success' && "bg-success/10",
                    (mpesaStatus === 'failed' || mpesaStatus === 'cancelled') && "bg-destructive/10"
                  )}>
                    {mpesaStatus === 'pending' && (
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin h-5 w-5 border-2 border-warning border-t-transparent rounded-full" />
                          <span className="text-warning font-medium">Waiting for payment...</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Check your phone for the M-Pesa prompt. 
                          {pollingCount > 0 && ` Checking... (${pollingCount}/12)`}
                        </p>
                      </div>
                    )}
                    {mpesaStatus === 'success' && (
                      <>
                        <Check className="h-5 w-5 text-success" />
                        <span className="text-success">Payment received!</span>
                      </>
                    )}
                    {mpesaStatus === 'failed' && (
                      <>
                        <X className="h-5 w-5 text-destructive" />
                        <span className="text-destructive">Payment failed</span>
                      </>
                    )}
                    {mpesaStatus === 'cancelled' && (
                      <>
                        <X className="h-5 w-5 text-destructive" />
                        <span className="text-destructive">Payment cancelled</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessing}>Cancel</Button>
            </DialogClose>
            {paymentMethod === 'cash' ? (
              <Button
                onClick={() => completeSale('cash')}
                disabled={isProcessing || cashChange < 0}
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </Button>
            ) : (
              <Button
                onClick={processMpesaPayment}
                disabled={isProcessing || !customerPhone || customerPhone.length < 10}
              >
                {isProcessing ? 'Processing...' : 'Send STK Push'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      {/* Loyalty Lookup */}
      <LoyaltyLookup
        isOpen={isLoyaltyOpen}
        onClose={() => setIsLoyaltyOpen(false)}
        onSelectCustomer={setLoyaltyCustomer}
        selectedCustomer={loyaltyCustomer}
        cartTotal={cartTotals.subtotal}
        onRedeemPoints={setPointsToRedeem}
      />

      {/* Receipt */}
      {lastSaleData && (
        <POSReceipt
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          businessProfile={profile}
          items={lastSaleData.items}
          subtotal={lastSaleData.subtotal}
          vatAmount={lastSaleData.vatAmount}
          total={lastSaleData.total}
          paymentMethod={lastSaleData.paymentMethod}
          cashReceived={lastSaleData.cashReceived}
          change={lastSaleData.change}
          loyaltyPointsEarned={lastSaleData.loyaltyPointsEarned}
          customerPhone={lastSaleData.customerPhone}
          mpesaReceiptNumber={lastSaleData.mpesaReceiptNumber}
        />
      )}
    </div>
  );
}
