import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Plus, X, Upload, Loader2, Banknote, CreditCard, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { EXPENSE_CATEGORIES, SALE_CATEGORIES, VAT_RATE, formatKES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Product } from '@/types';

interface TransactionFormProps {
  type: 'sale' | 'expense';
  products?: Product[];
  onSubmit: (data: {
    amount: number;
    description: string;
    category: string;
    customer?: string;
    vendor?: string;
    isVatApplicable: boolean;
    vatAmount?: number;
    date: Date;
    receiptImage?: string;
    paymentMethod?: 'cash' | 'mpesa';
    productId?: string;
    quantitySold?: number;
  }) => void;
  onBack: () => void;
}

export function TransactionForm({ type, products = [], onSubmit, onBack }: TransactionFormProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [contact, setContact] = useState('');
  const [includeVat, setIncludeVat] = useState(type === 'sale');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = type === 'sale' ? SALE_CATEGORIES : EXPENSE_CATEGORIES;
  
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
  );
  
  const numericAmount = parseFloat(amount) || 0;
  const vatAmount = includeVat ? numericAmount * VAT_RATE : 0;

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setAmount(String(product.unitPrice * quantity));
    setDescription(product.name);
    setCategory('product');
    setProductSearch('');
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setAmount('');
    setDescription('');
    setQuantity(1);
  };

  const updateQuantity = (newQty: number) => {
    if (newQty < 1) return;
    if (selectedProduct && newQty > selectedProduct.quantity) {
      toast.error(`Only ${selectedProduct.quantity} in stock`);
      return;
    }
    setQuantity(newQty);
    if (selectedProduct) {
      setAmount(String(selectedProduct.unitPrice * newQty));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      setReceiptImage(publicUrl);
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const removeReceipt = () => {
    setReceiptImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !category) return;

    onSubmit({
      amount: numericAmount,
      description,
      category,
      ...(type === 'sale' ? { customer: contact } : { vendor: contact }),
      isVatApplicable: includeVat,
      vatAmount: includeVat ? vatAmount : undefined,
      date: new Date(),
      receiptImage: receiptImage || undefined,
      paymentMethod: type === 'sale' ? paymentMethod : undefined,
      productId: selectedProduct?.id,
      quantitySold: selectedProduct ? quantity : undefined,
    });
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {type === 'sale' ? 'Record Sale' : 'Record Expense'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {type === 'sale' ? 'Add a new income entry' : 'Track your business costs'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Selection - Only for Sales */}
        {type === 'sale' && products.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Product</Label>
              {selectedProduct && (
                <Button type="button" variant="ghost" size="sm" onClick={clearProduct}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            
            {selectedProduct ? (
              <Card variant="interactive" className="p-4 border-primary">
                <div className="flex items-center gap-3">
                  {selectedProduct.imageUrl ? (
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">{formatKES(selectedProduct.unitPrice)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="icon-sm" onClick={() => updateQuantity(quantity - 1)}>
                      -
                    </Button>
                    <span className="w-8 text-center font-medium">{quantity}</span>
                    <Button type="button" variant="outline" size="icon-sm" onClick={() => updateQuantity(quantity + 1)}>
                      +
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <Badge variant={selectedProduct.quantity > 0 ? "secondary" : "destructive"}>
                    {selectedProduct.quantity} in stock
                  </Badge>
                  <span className="font-semibold text-primary">{formatKES(selectedProduct.unitPrice * quantity)}</span>
                </div>
              </Card>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start">
                    <Package className="w-4 h-4 mr-2" />
                    Choose from inventory...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-popover border border-border shadow-lg z-50" align="start">
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
                            onClick={() => selectProduct(product)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                          >
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{formatKES(product.unitPrice)}</p>
                            </div>
                            <Badge variant={product.quantity > 0 ? "secondary" : "destructive"} className="text-xs">
                              {product.quantity}
                            </Badge>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              Or enter manually below
            </p>
          </div>
        )}
        {/* Amount Input - Large and prominent */}
        <Card variant="metric" className="p-6">
          <Label className="text-sm text-muted-foreground mb-2 block">
            Amount (KES)
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-muted-foreground">KES</span>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-3xl font-bold border-0 bg-transparent p-0 h-auto focus-visible:ring-0 placeholder:text-foreground/30"
              required
            />
          </div>
          
          {/* VAT Toggle */}
          <div className="mt-4 pt-4 border-t border-border">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium text-foreground">
                  Include 16% VAT
                </span>
                {includeVat && numericAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    VAT Amount: KES {vatAmount.toLocaleString()}
                  </p>
                )}
              </div>
              <div 
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  includeVat ? "bg-primary" : "bg-muted"
                )}
                onClick={() => setIncludeVat(!includeVat)}
              >
                <div className={cn(
                  "absolute w-5 h-5 bg-card rounded-full top-0.5 transition-transform shadow-sm",
                  includeVat ? "translate-x-6" : "translate-x-0.5"
                )} />
              </div>
            </label>
          </div>
        </Card>

        {/* Category Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Category</Label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                  category === cat.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-xs font-medium text-center">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method - Only for Sales */}
        {type === 'sale' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value: 'cash' | 'mpesa') => setPaymentMethod(value)}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="payment-cash"
                className={cn(
                  "flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all",
                  paymentMethod === 'cash' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="cash" id="payment-cash" />
                <Banknote className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Cash</p>
                  <p className="text-xs text-muted-foreground">Direct payment</p>
                </div>
              </Label>
              <Label
                htmlFor="payment-mpesa"
                className={cn(
                  "flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all",
                  paymentMethod === 'mpesa' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="mpesa" id="payment-mpesa" />
                <CreditCard className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium text-sm">M-Pesa</p>
                  <p className="text-xs text-muted-foreground">Mobile money</p>
                </div>
              </Label>
            </RadioGroup>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'sale' ? 'What did you sell?' : 'What was this expense for?'}
            required
          />
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <Label htmlFor="contact" className="text-sm font-medium">
            {type === 'sale' ? 'Customer Name (optional)' : 'Vendor/Supplier (optional)'}
          </Label>
          <Input
            id="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={type === 'sale' ? 'e.g., John Mwangi' : 'e.g., Supplier Ltd'}
          />
        </div>

        {/* Receipt Upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        
        {receiptImage ? (
          <Card variant="interactive" className="p-4">
            <div className="relative">
              <img
                src={receiptImage}
                alt="Receipt"
                className="w-full h-40 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={removeReceipt}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Receipt attached
            </p>
          </Card>
        ) : (
          <Card 
            variant="interactive" 
            className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {uploading ? 'Uploading...' : 'Attach Receipt'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Take a photo or upload an image
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={uploading}>
                <Upload className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Submit Button */}
        <Button 
          type="submit" 
          variant={type === 'sale' ? 'success' : 'default'}
          size="xl" 
          className="w-full"
          disabled={!amount || !description || !category || uploading}
        >
          {type === 'sale' ? 'Record Sale' : 'Record Expense'}
        </Button>
      </form>
    </div>
  );
}