import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Send, Download, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { VAT_RATE, formatKES } from '@/lib/constants';
import { InvoiceItem, BusinessProfile, Product } from '@/types';
import { cn } from '@/lib/utils';
import { PinVerifier } from '@/components/kra/PinVerifier';

interface ExtendedInvoiceItem extends InvoiceItem {
  productId?: string;
}

interface InvoiceCreatorProps {
  profile: BusinessProfile;
  products: Product[];
  onSubmit: (data: {
    customer: { name: string; phone?: string; email?: string; kraPin?: string };
    items: InvoiceItem[];
    subtotal: number;
    vatAmount: number;
    total: number;
    paymentMethod: 'cash' | 'mpesa';
    dueDate: Date;
    status: 'draft' | 'sent';
    productUpdates?: { productId: string; quantitySold: number }[];
  }) => void;
  onBack: () => void;
}

export function InvoiceCreator({ profile, products, onSubmit, onBack }: InvoiceCreatorProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerKraPin, setCustomerKraPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<ExtendedInvoiceItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const hasKraCredentials = !!(profile.kraApiKey && profile.kraApiSecret);
  
  // Check if user can use KRA features (must be on paid plan, not trial)
  const paidPlans = ['starter', 'business', 'pro'];
  const isPremium = paidPlans.includes(profile.subscriptionPlan || '');
  const trialEndsAt = profile.trialEndsAt ? new Date(profile.trialEndsAt) : null;
  const isTrialActive = trialEndsAt ? trialEndsAt > new Date() : false;
  const canUseKraFeatures = hasKraCredentials && isPremium && !isTrialActive;

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const addProductToInvoice = (product: Product) => {
    setItems([...items, {
      description: product.name,
      quantity: 1,
      unitPrice: product.unitPrice,
      total: product.unitPrice,
      productId: product.id,
    }]);
    setProductSearch('');
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    if (field === 'description') {
      updated[index].description = value as string;
    } else if (field === 'quantity') {
      updated[index].quantity = Number(value) || 0;
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    } else if (field === 'unitPrice') {
      updated[index].unitPrice = Number(value) || 0;
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = profile.isVatRegistered ? subtotal * VAT_RATE : 0;
  const total = subtotal + vatAmount;

  const handleSubmit = (status: 'draft' | 'sent') => {
    if (!customerName || items.every(i => !i.description)) return;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    // Collect product updates for stock deduction
    const productUpdates = items
      .filter(item => item.productId && item.quantity > 0)
      .map(item => ({
        productId: item.productId!,
        quantitySold: item.quantity,
      }));

    onSubmit({
      customer: {
        name: customerName,
        phone: customerPhone || undefined,
        kraPin: customerKraPin || undefined,
      },
      items: items.filter(i => i.description).map(({ productId, ...rest }) => rest),
      subtotal,
      vatAmount,
      total,
      paymentMethod,
      dueDate,
      status,
      productUpdates: productUpdates.length > 0 ? productUpdates : undefined,
    });
  };

  const getProductStock = (productId?: string) => {
    if (!productId) return null;
    return products.find(p => p.id === productId);
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Create Invoice</h1>
          <p className="text-sm text-muted-foreground">
            Generate a professional invoice
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Business Preview */}
        <Card variant="gradient" className="p-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            {profile.logoUrl ? (
              <img 
                src={profile.logoUrl} 
                alt="Business logo" 
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                {profile.businessName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{profile.businessName}</p>
              <p className="text-xs text-muted-foreground">KRA PIN: {profile.kraPin}</p>
            </div>
          </div>
        </Card>

        {/* Customer Details */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Customer Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="customerName" className="text-xs">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g., ABC Company Ltd"
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="customerPhone" className="text-xs">Phone Number</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+254..."
              />
            </div>
            
            {/* Customer KRA PIN */}
            <div className="col-span-2">
              <Label htmlFor="customerKraPin" className="text-xs">Customer KRA PIN (Optional)</Label>
              <Input
                id="customerKraPin"
                value={customerKraPin}
                onChange={(e) => setCustomerKraPin(e.target.value.toUpperCase())}
                placeholder="e.g., A123456789B"
                maxLength={11}
              />
            </div>
            
            {/* KRA PIN Verification */}
            {canUseKraFeatures && (
              <div className="col-span-2">
                <PinVerifier
                  onVerified={(result) => {
                    setPinVerified(result.valid);
                    if (result.valid && result.name) {
                      setCustomerName(result.name);
                    }
                    if (result.valid) {
                      // Auto-fill the KRA PIN field if verified
                      setCustomerKraPin(result.pin || '');
                    }
                  }}
                />
                {pinVerified && (
                  <p className="text-xs text-success mt-1">
                    Customer PIN verified successfully
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Payment Method</h2>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(value: 'cash' | 'mpesa') => setPaymentMethod(value)}
            className="grid grid-cols-2 gap-3"
          >
            <Label
              htmlFor="cash"
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <RadioGroupItem value="cash" id="cash" />
              <div>
                <p className="font-medium">Cash</p>
                <p className="text-xs text-muted-foreground">Direct payment</p>
              </div>
            </Label>
            <Label
              htmlFor="mpesa"
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                paymentMethod === 'mpesa' ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <RadioGroupItem value="mpesa" id="mpesa" />
              <div>
                <p className="font-medium">M-Pesa</p>
                <p className="text-xs text-muted-foreground">Mobile money</p>
              </div>
            </Label>
          </RadioGroup>
        </div>

        {/* Invoice Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Items</h2>
            <div className="flex gap-2">
              {products.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      <Package className="w-4 h-4 mr-1" />
                      From Stock
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 bg-popover border border-border shadow-lg z-50" align="end">
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-8 h-9"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {filteredProducts.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">No products found</p>
                        ) : (
                          filteredProducts.slice(0, 10).map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => addProductToInvoice(product)}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
                            >
                              <div>
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{formatKES(product.unitPrice)}</p>
                              </div>
                              <Badge variant={product.quantity > 0 ? "secondary" : "destructive"} className="text-xs">
                                {product.quantity} in stock
                              </Badge>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Manual
              </Button>
            </div>
          </div>

          {items.map((item, index) => {
            const linkedProduct = getProductStock(item.productId);
            const isLowStock = linkedProduct && item.quantity > linkedProduct.quantity;
            
            return (
              <Card key={index} variant="flat" className={cn(
                "p-4 bg-muted/30 border",
                isLowStock ? "border-warning" : "border-border"
              )}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                      {linkedProduct && (
                        <Badge variant="outline" className="text-xs">
                          <Package className="w-3 h-3 mr-1" />
                          {linkedProduct.quantity} available
                        </Badge>
                      )}
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {isLowStock && (
                    <p className="text-xs text-warning">
                      Warning: Only {linkedProduct.quantity} in stock
                    </p>
                  )}
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Item description"
                    disabled={!!item.productId}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        min="1"
                        max={linkedProduct ? linkedProduct.quantity : undefined}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        placeholder="KES"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <div className="h-11 px-3 flex items-center text-sm font-medium bg-muted rounded-lg">
                        {formatKES(item.total)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Totals */}
        <Card variant="metric" className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatKES(subtotal)}</span>
            </div>
            {profile.isVatRegistered && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT (16%)</span>
                <span className="font-medium">{formatKES(vatAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-border flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">{formatKES(total)}</span>
            </div>
          </div>
        </Card>

        {/* M-Pesa Payment Info */}
        {(profile.mpesaPaybill || profile.mpesaTillNumber) && (
          <Card variant="success" className="p-4">
            <p className="text-sm font-medium text-foreground mb-2">Payment Details (Auto-included)</p>
            <div className="text-xs text-muted-foreground space-y-1">
              {profile.mpesaPaybill && (
                <p>M-Pesa Paybill: <span className="font-semibold text-foreground">{profile.mpesaPaybill}</span></p>
              )}
              {profile.mpesaTillNumber && (
                <p>Till Number: <span className="font-semibold text-foreground">{profile.mpesaTillNumber}</span></p>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleSubmit('draft')}
            disabled={!customerName}
          >
            <Download className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => handleSubmit('sent')}
            disabled={!customerName}
          >
            <Send className="w-4 h-4 mr-2" />
            Send Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
