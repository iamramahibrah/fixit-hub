import { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Search, Package, Edit2, Trash2, AlertTriangle, Upload, X, Image as ImageIcon, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Product } from '@/types';
import { formatKES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InventoryManagementProps {
  products: Product[];
  onBack: () => void;
  onAdd: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Product>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function InventoryManagement({ products, onBack, onAdd, onUpdate, onDelete }: InventoryManagementProps) {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [autoGenerateImage, setAutoGenerateImage] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    unitPrice: 0,
    costPrice: 0,
    quantity: 0,
    minimumStock: 5,
    category: '',
    imageUrl: '',
  });

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
    );
  }, [products, search]);

  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.quantity <= (p.minimumStock || 0));
  }, [products]);

  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
  }, [products]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      unitPrice: 0,
      costPrice: 0,
      quantity: 0,
      minimumStock: 5,
      category: '',
      imageUrl: '',
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('products')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('products')
        .getPublicUrl(data.path);

      setFormData(prev => ({ ...prev, imageUrl: urlData.publicUrl }));
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const generateProductImage = async (productName: string, category?: string, description?: string) => {
    setIsGeneratingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('generate-product-image', {
        body: { productName, category, description },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate image');
      }

      if (response.data?.success && response.data?.imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl: response.data.imageUrl }));
        toast.success('AI image generated!');
        return response.data.imageUrl;
      } else {
        throw new Error(response.data?.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error('Failed to generate image');
      return null;
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) return;

    let finalImageUrl = formData.imageUrl;

    // Auto-generate image if enabled and no image is set (only for new products)
    if (!editingProduct && autoGenerateImage && !finalImageUrl && formData.name) {
      const generatedUrl = await generateProductImage(
        formData.name,
        formData.category,
        formData.description
      );
      if (generatedUrl) {
        finalImageUrl = generatedUrl;
      }
    }

    if (editingProduct) {
      await onUpdate(editingProduct.id, {
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        unitPrice: formData.unitPrice,
        costPrice: formData.costPrice || undefined,
        quantity: formData.quantity,
        minimumStock: formData.minimumStock || undefined,
        category: formData.category || undefined,
        imageUrl: finalImageUrl || undefined,
      });
      setEditingProduct(null);
    } else {
      await onAdd({
        name: formData.name,
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        unitPrice: formData.unitPrice,
        costPrice: formData.costPrice || undefined,
        quantity: formData.quantity,
        minimumStock: formData.minimumStock || undefined,
        category: formData.category || undefined,
        imageUrl: finalImageUrl || undefined,
      });
    }
    resetForm();
    setIsAddOpen(false);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      unitPrice: product.unitPrice,
      costPrice: product.costPrice || 0,
      quantity: product.quantity,
      minimumStock: product.minimumStock || 5,
      category: product.category || '',
      imageUrl: product.imageUrl || '',
    });
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
            <p className="text-sm text-muted-foreground">Manage products & stock</p>
          </div>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setEditingProduct(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Auto-generate toggle for new products */}
              {!editingProduct && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-primary" />
                    <div>
                      <Label htmlFor="auto-generate" className="text-sm font-medium">
                        Auto-generate image with AI
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Creates a product image automatically when saving
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="auto-generate"
                    checked={autoGenerateImage}
                    onCheckedChange={setAutoGenerateImage}
                  />
                </div>
              )}

              {/* Image Upload */}
              <div>
                <Label>Product Image</Label>
                <div className="mt-2 flex items-start gap-3">
                  {formData.imageUrl ? (
                    <div className="relative inline-block">
                      <img 
                        src={formData.imageUrl} 
                        alt="Product" 
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer",
                          "hover:border-primary hover:bg-muted/50 transition-colors",
                          isUploading && "opacity-50 pointer-events-none"
                        )}
                      >
                        {isUploading ? (
                          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        ) : (
                          <>
                            <ImageIcon className="h-8 w-8 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Upload</span>
                          </>
                        )}
                      </div>
                      {/* Manual generate button */}
                      <Button
                        type="button"
                        variant="outline"
                        className="h-32 w-32 flex flex-col gap-1"
                        disabled={isGeneratingImage || !formData.name}
                        onClick={() => generateProductImage(formData.name, formData.category, formData.description)}
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-xs">Generating...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-6 w-6 text-primary" />
                            <span className="text-xs">AI Generate</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                {!formData.imageUrl && autoGenerateImage && !editingProduct && (
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 An image will be auto-generated when you save if none is uploaded
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Widget Pro"
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU / Barcode</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., WGT-001"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Electronics"
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Selling Price (KES)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    value={formData.unitPrice || ''}
                    onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="costPrice">Cost Price (KES)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    value={formData.costPrice || ''}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Stock Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="minimumStock">Min. Stock Level</Label>
                  <Input
                    id="minimumStock"
                    type="number"
                    value={formData.minimumStock || ''}
                    onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isGeneratingImage}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmit} disabled={!formData.name || isGeneratingImage}>
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Image...
                  </>
                ) : editingProduct ? 'Update' : 'Add Product'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Products</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Stock Value</p>
            <p className="text-lg font-bold text-foreground">{formatKES(totalValue)}</p>
          </CardContent>
        </Card>
        <Card className={cn(lowStockProducts.length > 0 && "bg-warning/10 border-warning/20")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-4 w-4", lowStockProducts.length > 0 ? "text-warning" : "text-muted-foreground")} />
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
            <p className={cn("text-2xl font-bold", lowStockProducts.length > 0 ? "text-warning" : "text-foreground")}>
              {lowStockProducts.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Categories</p>
            <p className="text-2xl font-bold text-foreground">
              {new Set(products.filter(p => p.category).map(p => p.category)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No products found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add your first product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.sku || '-'}
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="secondary">{product.category}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatKES(product.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={cn(
                          product.quantity <= (product.minimumStock || 0)
                            ? "bg-warning/20 text-warning"
                            : "bg-success/20 text-success"
                        )}>
                          {product.quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={() => onDelete(product.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Showing {filteredProducts.length} of {products.length} products
      </p>
    </div>
  );
}
