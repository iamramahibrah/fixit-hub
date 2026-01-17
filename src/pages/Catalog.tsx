import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShoppingBag, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatKES } from '@/lib/constants';
import { PublicNavbar } from '@/components/public/PublicNavbar';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  public_description: string | null;
  unit_price: number;
  show_price: boolean;
  category: string | null;
  image_url: string | null;
  quantity: number;
  images: ProductImage[];
}

export default function Catalog() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [appName, setAppName] = useState('KRA ASSIST');
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [catalogEnabled, setCatalogEnabled] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch app settings
        const { data: nameData } = await supabase.rpc('get_app_setting', { setting_key: 'app_name' });
        const { data: catalogData } = await supabase.rpc('get_app_setting', { setting_key: 'catalog_enabled' });
        
        if (nameData) setAppName(nameData);
        if (catalogData) setCatalogEnabled(catalogData === 'true');

        // Fetch public products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, description, public_description, unit_price, show_price, category, image_url, quantity')
          .eq('is_public', true);

        if (productsError) throw productsError;

        // Fetch images for each product
        const productsWithImages = await Promise.all(
          (productsData || []).map(async (product) => {
            const { data: images } = await supabase
              .from('product_images')
              .select('*')
              .eq('product_id', product.id)
              .order('sort_order', { ascending: true });

            return {
              ...product,
              images: images || [],
            };
          })
        );

        setProducts(productsWithImages);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = !search || 
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase()) ||
      product.public_description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (e: React.MouseEvent, product: PublicProduct) => {
    e.stopPropagation();
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
    });
    toast.success('Added to cart');
  };

  if (!catalogEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Catalog Coming Soon</h1>
          <p className="text-muted-foreground mb-6">Our product catalog is currently being updated.</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar activeLink="/catalog" />

      {/* Hero */}
      <section className="py-12 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Product Catalog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Explore our selection of quality products
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category as string)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No products found</h2>
              <p className="text-muted-foreground">
                {search ? 'Try adjusting your search criteria' : 'Check back later for new products'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Interested in Our Products?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Contact us for inquiries, bulk orders, or custom solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/contact')}>
              Contact Us
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/services')}>
              View Services
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {appName}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

interface ProductCardProps {
  product: PublicProduct;
  onAddToCart: (e: React.MouseEvent, product: PublicProduct) => void;
}

function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const navigate = useNavigate();
  const allImages = product.images.length > 0 
    ? product.images 
    : product.image_url 
      ? [{ id: 'main', image_url: product.image_url, alt_text: product.name, sort_order: 0, is_primary: true }]
      : [];

  const description = product.public_description || product.description;
  const inStock = product.quantity > 0;

  return (
    <Card 
      className="overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="relative aspect-square bg-muted">
        {allImages.length > 1 ? (
          <Carousel className="w-full h-full">
            <CarouselContent className="-ml-0">
              {allImages.map((image, index) => (
                <CarouselItem key={image.id} className="pl-0">
                  <div className="aspect-square">
                    <img
                      src={image.image_url}
                      alt={image.alt_text || `${product.name} image ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CarouselNext className="right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
            {/* Dots indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {allImages.map((_, index) => (
                <div
                  key={index}
                  className="w-1.5 h-1.5 rounded-full bg-background/70"
                />
              ))}
            </div>
          </Carousel>
        ) : allImages.length === 1 ? (
          <img
            src={allImages[0].image_url}
            alt={allImages[0].alt_text || product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        {product.category && (
          <Badge className="absolute top-2 left-2 bg-background/80 text-foreground">
            {product.category}
          </Badge>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
          {product.name}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>
        )}
        <div className="flex items-center justify-between">
          {product.show_price && (
            <p className="text-lg font-bold text-primary">
              {formatKES(product.unit_price)}
            </p>
          )}
          {product.show_price && inStock && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => onAddToCart(e, product)}
              className="gap-1"
            >
              <ShoppingCart className="h-4 w-4" />
              Add
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
