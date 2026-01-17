import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Receipt, Calculator, BarChart3, Shield, Clock, Smartphone, Users, Package, Menu, X, Monitor, HardDrive, Network, Cloud, LockKeyhole, Code } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const iconMap: Record<string, any> = {
  Receipt,
  Calculator,
  BarChart3,
  Shield,
  Clock,
  Smartphone,
  Users,
  Package,
  Monitor,
  HardDrive,
  Network,
  Cloud,
  LockKeyhole,
  Code,
  Building2,
};

interface ServiceOffering {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  image_url: string | null;
  category: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
}

export default function Services() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appName, setAppName] = useState('KRA ASSIST');
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('service_offerings')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setServices(data || []);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  // Featured services (ICT Support, Hardware Support)
  const featuredServices = services.filter(s => s.is_featured);
  const regularServices = services.filter(s => !s.is_featured);

  const NavLinks = () => (
    <>
      <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
      <Link to="/services" className="text-foreground font-medium">Services</Link>
      <Link to="/catalog" className="text-muted-foreground hover:text-foreground transition-colors">Catalog</Link>
      <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
      <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
    </>
  );

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Building2;
    return iconMap[iconName] || Building2;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
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
          
          <div className="hidden md:flex items-center gap-8">
            <NavLinks />
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/')}>Dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/auth')}>Login</Button>
                <Button onClick={() => navigate('/auth')}>Get Started</Button>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border p-4 space-y-4 bg-card">
            <div className="flex flex-col gap-3">
              <NavLinks />
            </div>
            <div className="flex flex-col gap-2 pt-4">
              {user ? (
                <Button onClick={() => navigate('/')}>Dashboard</Button>
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

      {/* Hero */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Our Services
          </h1>
          <p className="text-xl text-muted-foreground">
            Comprehensive tools to manage every aspect of your business finances
          </p>
        </div>
      </section>

      {/* Featured Services */}
      {featuredServices.length > 0 && (
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Featured Services</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredServices.map((service) => {
                const Icon = getIcon(service.icon_name);
                return (
                  <Card key={service.id} className="overflow-hidden hover:shadow-xl transition-shadow border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-8">
                      <div className="flex items-start gap-6">
                        {service.image_url ? (
                          <img 
                            src={service.image_url} 
                            alt={service.title}
                            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Icon className="h-8 w-8 text-primary" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-foreground mb-2">{service.title}</h3>
                          <p className="text-muted-foreground leading-relaxed">{service.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Regular Services Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-muted rounded-xl mb-4" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3 mt-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : regularServices.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularServices.map((service) => {
                const Icon = getIcon(service.icon_name);
                return (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {service.image_url ? (
                        <img 
                          src={service.image_url} 
                          alt={service.title}
                          className="w-full h-32 rounded-xl object-cover mb-4"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <h3 className="text-lg font-semibold text-foreground mb-2">{service.title}</h3>
                      <p className="text-muted-foreground">{service.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No services available at the moment.</p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Try all features free for 14 days. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/pricing')}>
              View Pricing
            </Button>
          </div>
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