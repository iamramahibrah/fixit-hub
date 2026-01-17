import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Package, Eye, EyeOff, Upload, X, GripVertical, Plus, Trash2, 
  Image as ImageIcon, Search, CheckCircle, Save, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatKES } from '@/lib/constants';

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  public_description: string | null;
  unit_price: number;
  category: string | null;
  image_url: string | null;
  is_public: boolean;
  show_price: boolean;
  user_id: string;
}

interface ProductWithImages extends Product {
  images: ProductImage[];
}

export function AdminCatalogManager() {
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catalogEnabled, setCatalogEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithImages | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    public_description: '',
    is_public: false,
    show_price: true,
  });
  const [editImages, setEditImages] = useState<ProductImage[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchCatalogSetting();
  }, []);

  const fetchCatalogSetting = async () => {
    try {
      const { data } = await supabase.rpc('get_app_setting', { setting_key: 'catalog_enabled' });
      setCatalogEnabled(data === 'true');
    } catch (error) {
      console.error('Error fetching catalog setting:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch all products (admin can see all)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      // Fetch images for products
      const productsWithImages = await Promise.all(
        (productsData || []).map(async (product) => {
          const { data: images } = await supabase
            .from('product_images')
            .select('*')
            .eq('product_id', product.id)
            .order('sort_order');

          return {
            ...product,
            is_public: product.is_public ?? false,
            show_price: product.show_price ?? true,
            public_description: product.public_description ?? null,
            images: images || [],
          };
        })
      );

      setProducts(productsWithImages);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const toggleCatalogEnabled = async () => {
    setSaving(true);
    try {
      const newValue = !catalogEnabled;
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key: 'catalog_enabled', value: String(newValue) }, { onConflict: 'key' });

      if (error) throw error;

      setCatalogEnabled(newValue);
      toast.success(`Product catalog ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating catalog setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const toggleProductVisibility = async (product: ProductWithImages) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_public: !product.is_public })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, is_public: !p.is_public } : p
      ));

      toast.success(product.is_public ? 'Product hidden from catalog' : 'Product visible in catalog');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const openEditDialog = (product: ProductWithImages) => {
    setEditingProduct(product);
    setEditForm({
      public_description: product.public_description || '',
      is_public: product.is_public,
      show_price: product.show_price,
    });
    setEditImages(product.images);
    setEditDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !editingProduct) return;

    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error('Please upload only image files');
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image must be less than 5MB');
          continue;
        }

        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data, error: uploadError } = await supabase.storage
          .from('products')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('products').getPublicUrl(data.path);

        // Insert into product_images table
        const { data: newImage, error: insertError } = await supabase
          .from('product_images')
          .insert({
            product_id: editingProduct.id,
            image_url: urlData.publicUrl,
            alt_text: file.name,
            sort_order: editImages.length,
            is_primary: editImages.length === 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setEditImages(prev => [...prev, newImage]);
      }

      toast.success('Images uploaded successfully');
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      setEditImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image removed');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  const setPrimaryImage = async (imageId: string) => {
    if (!editingProduct) return;

    try {
      // Reset all images for this product
      await supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', editingProduct.id);

      // Set new primary
      const { error } = await supabase
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', imageId);

      if (error) throw error;

      setEditImages(prev => prev.map(img => ({
        ...img,
        is_primary: img.id === imageId,
      })));

      toast.success('Primary image updated');
    } catch (error) {
      console.error('Error setting primary image:', error);
      toast.error('Failed to update primary image');
    }
  };

  const saveProductChanges = async () => {
    if (!editingProduct) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({
          public_description: editForm.public_description || null,
          is_public: editForm.is_public,
          show_price: editForm.show_price,
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id 
          ? { ...p, ...editForm, images: editImages } 
          : p
      ));

      toast.success('Product updated successfully');
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const publicCount = products.filter(p => p.is_public).length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Catalog Management
              </CardTitle>
              <CardDescription>
                Manage which products appear in your public catalog
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="catalog-enabled" className="text-sm">
                  Catalog Enabled
                </Label>
                <Switch
                  id="catalog-enabled"
                  checked={catalogEnabled}
                  onCheckedChange={toggleCatalogEnabled}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="text-sm">
              {publicCount} / {products.length} public
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Images</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url || product.images[0]?.image_url ? (
                        <img
                          src={product.images.find(i => i.is_primary)?.image_url || product.images[0]?.image_url || product.image_url || ''}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.public_description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.public_description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline">{product.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatKES(product.unit_price)}</span>
                        {!product.show_price && (
                          <Badge variant="secondary" className="text-xs">Hidden</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {product.images.length} images
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProductVisibility(product)}
                        className={cn(
                          product.is_public 
                            ? 'text-success hover:text-success' 
                            : 'text-muted-foreground'
                        )}
                      >
                        {product.is_public ? (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Public
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Hidden
                          </>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Catalog Product: {editingProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-6 py-4">
              {/* Visibility Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show in Public Catalog</Label>
                    <p className="text-xs text-muted-foreground">Make this product visible to visitors</p>
                  </div>
                  <Switch
                    checked={editForm.is_public}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Show Price</Label>
                    <p className="text-xs text-muted-foreground">Display the product price publicly</p>
                  </div>
                  <Switch
                    checked={editForm.show_price}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, show_price: checked }))}
                  />
                </div>
              </div>

              {/* Public Description */}
              <div className="space-y-2">
                <Label>Public Description</Label>
                <Textarea
                  value={editForm.public_description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, public_description: e.target.value }))}
                  placeholder="Enter a description for the public catalog..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default product description
                </p>
              </div>

              {/* Product Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Product Images</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Images
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {editImages.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {editImages.map((image, index) => (
                      <div 
                        key={image.id} 
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2",
                          image.is_primary ? "border-primary" : "border-transparent"
                        )}
                      >
                        <img
                          src={image.image_url}
                          alt={image.alt_text || `Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!image.is_primary && (
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={() => setPrimaryImage(image.id)}
                              title="Set as primary"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => removeImage(image.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {image.is_primary && (
                          <Badge className="absolute top-1 left-1 text-xs">Primary</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No images added yet</p>
                    <p className="text-xs text-muted-foreground">Click "Add Images" to upload</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProductChanges} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}