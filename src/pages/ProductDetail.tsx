import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, ShoppingCart, ChevronLeft, Minus, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatKES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface ProductDetailType {
  id: string;
  name: string;
  description: string | null;
  public_description: string | null;
  unit_price: number;
  show_price: boolean;
  category: string | null;
  image_url: string | null;
  sku: string | null;
  quantity: number;
  images: ProductImage[];
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [appName, setAppName] = useState('KRA ASSIST');
  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<ProductDetailType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        // Fetch app settings
        const { data: nameData } = await supabase.rpc('get_app_setting', { setting_key: 'app_name' });
        if (nameData) setAppName(nameData);

        // Fetch product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('id, name, description, public_description, unit_price, show_price, category, image_url, sku, quantity')
          .eq('id', id)
          .eq('is_public', true)
          .single();

        if (productError) throw productError;

        // Fetch product images
        const { data: images } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', id)
          .order('sort_order', { ascending: true });

        const productWithImages = {
          ...productData,
          images: images || [],
        };

        setProduct(productWithImages);

        // Fetch related products (same category)
        if (productData.category) {
          const { data: relatedData } = await supabase
            .from('products')
            .select('id, name, description, public_description, unit_price, show_price, category, image_url, sku, quantity')
            .eq('is_public', true)
            .eq('category', productData.category)
            .neq('id', id)
            .limit(4);

          if (relatedData) {
            const relatedWithImages = await Promise.all(
              relatedData.map(async (p) => {
                const { data: imgs } = await supabase
                  .from('product_images')
                  .select('*')
                  .eq('product_id', p.id)
                  .order('sort_order', { ascending: true });
                return { ...p, images: imgs || [] };
              })
            );
            setRelatedProducts(relatedWithImages);
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        navigate('/catalog');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(prev + delta, product?.quantity || 99)));
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.quantity <= 0) {
      toast.error('This product is out of stock');
      return;
    }
    const primaryImage = product.images.find(i => i.is_primary)?.image_url || product.images[0]?.image_url || product.image_url;
    addToCart({
      id: product.id,
      name: product.name,
      unit_price: product.unit_price,
      image_url: primaryImage,
      max_quantity: product.quantity,
      quantity: quantity,
    });
    toast.success(`Added ${quantity} item${quantity > 1 ? 's' : ''} to cart`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  const allImages = product?.images.length 
    ? product.images 
    : product?.image_url 
      ? [{ id: 'main', image_url: product.image_url, alt_text: product.name, sort_order: 0, is_primary: true }]
      : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">This product may have been removed or is unavailable.</p>
          <Button onClick={() => navigate('/catalog')}>Back to Catalog</Button>
        </div>
      </div>
    );
  }

  const description = product.public_description || product.description;
  const inStock = product.quantity > 0;

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar activeLink="/catalog" />

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/catalog')} className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Catalog
        </Button>
      </div>

      {/* Product Content */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-muted rounded-xl overflow-hidden">
                {allImages.length > 0 ? (
                  <img
                    src={allImages[selectedImageIndex]?.image_url}
                    alt={allImages[selectedImageIndex]?.alt_text || product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-24 w-24 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {allImages.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={cn(
                        "w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors",
                        selectedImageIndex === index 
                          ? "border-primary" 
                          : "border-transparent hover:border-muted-foreground/50"
                      )}
                    >
                      <img
                        src={image.image_url}
                        alt={image.alt_text || `${product.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {product.category && (
                <Badge variant="secondary">{product.category}</Badge>
              )}

              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
                  {product.name}
                </h1>
                {product.sku && (
                  <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                )}
              </div>

              {product.show_price && (
                <p className="text-3xl font-bold text-primary">
                  {formatKES(product.unit_price)}
                </p>
              )}

              {description && (
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="whitespace-pre-wrap">{description}</p>
                </div>
              )}

              <Separator />

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {inStock ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-sm text-success">In Stock ({product.quantity} available)</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-destructive" />
                    <span className="text-sm text-destructive">Out of Stock</span>
                  </>
                )}
              </div>

              {/* Quantity Selector */}
              {inStock && product.show_price && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-12 text-center font-medium">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(1)}
                        disabled={quantity >= product.quantity}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="text-xl font-bold text-foreground">
                      {formatKES(product.unit_price * quantity)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" className="flex-1 gap-2" onClick={handleAddToCart}>
                      <ShoppingCart className="h-5 w-5" />
                      Add to Cart
                    </Button>
                    <Button size="lg" className="flex-1" onClick={handleBuyNow}>
                      Buy Now
                    </Button>
                  </div>
                </div>
              )}

              {!product.show_price && (
                <Button size="lg" className="w-full" onClick={() => navigate('/contact')}>
                  Contact for Price
                </Button>
              )}

              {/* Features */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">Secure payment via M-Pesa or Card</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">Fast delivery across Kenya</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-muted-foreground">Quality guaranteed</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-12 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">Related Products</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map(relatedProduct => {
                const relatedImage = relatedProduct.images[0]?.image_url || relatedProduct.image_url;
                return (
                  <Card 
                    key={relatedProduct.id} 
                    className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/product/${relatedProduct.id}`)}
                  >
                    <div className="aspect-square bg-muted">
                      {relatedImage ? (
                        <img
                          src={relatedImage}
                          alt={relatedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground line-clamp-1">{relatedProduct.name}</h3>
                      {relatedProduct.show_price && (
                        <p className="text-lg font-bold text-primary mt-1">
                          {formatKES(relatedProduct.unit_price)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
