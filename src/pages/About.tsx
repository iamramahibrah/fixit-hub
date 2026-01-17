import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Target, Users, Award, Menu, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function About() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const NavLinks = () => (
    <>
      <Link to="/about" className="text-foreground font-medium">About</Link>
      <Link to="/services" className="text-muted-foreground hover:text-foreground transition-colors">Services</Link>
      <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
      <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
    </>
  );

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
            About {appName}
          </h1>
          <p className="text-xl text-muted-foreground">
            We're on a mission to simplify accounting and tax compliance for Kenyan small and medium businesses.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-muted-foreground">
                To empower Kenyan SMEs with simple, affordable, and compliant accounting tools that help them focus on growing their business instead of worrying about paperwork and tax deadlines.
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-8">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Our Vision</h2>
              <p className="text-muted-foreground">
                To be the leading accounting platform for small businesses in East Africa, making financial management accessible to every entrepreneur.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Values</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Simplicity</h3>
                <p className="text-muted-foreground">
                  We believe accounting shouldn't be complicated. Our tools are designed to be intuitive and easy to use.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Reliability</h3>
                <p className="text-muted-foreground">
                  Your business data is safe with us. We ensure 99.9% uptime and secure data handling.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Compliance</h3>
                <p className="text-muted-foreground">
                  Stay on the right side of KRA with our built-in compliance features and timely reminders.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Join Our Growing Community
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start your free trial today and see why businesses trust us.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')}>
            Get Started Free
          </Button>
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
