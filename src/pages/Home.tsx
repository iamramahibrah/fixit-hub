import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, ArrowRight, BarChart3, Receipt, Calculator, 
  Shield, Clock, Smartphone, Building2, Menu, X, ShoppingCart 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/contexts/CartContext';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { totalItems } = useCart();
  const [appName, setAppName] = useState('KRA ASSIST');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: logoData } = await supabase.rpc('get_app_setting', { setting_key: 'app_logo' });
        const { data: nameData } = await supabase.rpc('get_app_setting', { setting_key: 'app_name' });
        if (logoData) setAppLogo(logoData);
        if (nameData) setAppName(nameData);
      } catch (error) {
        console.error('Error fetching app settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const features = [
    { icon: Receipt, title: 'Easy Invoicing', description: 'Create and send professional invoices in seconds' },
    { icon: Calculator, title: 'VAT Management', description: 'Automatic VAT calculations and KRA-ready reports' },
    { icon: BarChart3, title: 'Real-time Reports', description: 'Track sales, expenses, and profits at a glance' },
    { icon: Shield, title: 'KRA Compliant', description: 'eTIMS integration for tax compliance' },
    { icon: Clock, title: 'Deadline Reminders', description: 'Never miss a tax filing deadline again' },
    { icon: Smartphone, title: 'POS System', description: 'Built-in point of sale for quick transactions' },
  ];

  const NavLinks = () => (
    <>
      <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
      <Link to="/services" className="text-muted-foreground hover:text-foreground transition-colors">Services</Link>
      <Link to="/catalog" className="text-muted-foreground hover:text-foreground transition-colors">Catalog</Link>
      <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
      <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            {appLogo ? (
              <img src={appLogo} alt={appName} className="w-14 h-14 rounded-lg object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-lg gradient-primary flex items-center justify-center">
                <Building2 className="h-7 w-7 text-primary-foreground" />
              </div>
            )}
            <span className="font-bold text-xl">{appName}</span>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <NavLinks />
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* Cart Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {totalItems > 99 ? '99+' : totalItems}
                </Badge>
              )}
            </Button>

            {user ? (
              <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>Login</Button>
                <Button onClick={() => navigate('/auth')}>Get Started</Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {totalItems > 99 ? '99+' : totalItems}
                </Badge>
              )}
            </Button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border p-4 space-y-4 bg-card">
            <div className="flex flex-col gap-3">
              <NavLinks />
            </div>
            <div className="flex flex-col gap-2 pt-4">
              {user ? (
                <Button onClick={() => navigate('/dashboard')}>Dashboard</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate('/auth')}>Login</Button>
                  <Button onClick={() => navigate('/auth')}>Get Started</Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
            🎉 14-Day Free Trial - No Credit Card Required
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Simple Accounting & Tax<br />
            <span className="text-primary">Compliance for Kenyan SMEs</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Track sales, manage expenses, calculate VAT, and stay KRA-compliant - all from one powerful platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/pricing')} className="text-lg px-8">
              View Pricing
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              M-Pesa Payments
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              KRA eTIMS Ready
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              Mobile Friendly
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed specifically for Kenyan small and medium businesses
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Ready to Simplify Your Business Accounting?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of Kenyan businesses that trust us for their accounting needs.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
            Start Your Free Trial Today
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {appLogo ? (
                  <img src={appLogo} alt={appName} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <span className="font-bold">{appName}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Simple accounting & tax compliance for Kenyan SMEs.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/services" className="hover:text-foreground">Features</Link></li>
                <li><Link to="/catalog" className="hover:text-foreground">Product Catalog</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
