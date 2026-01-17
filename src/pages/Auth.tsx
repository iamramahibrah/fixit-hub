import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Mail, Lock, Phone, Upload } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  businessName: z.string().trim().min(1, { message: "Business name is required" }).max(100),
  phoneNumber: z.string().trim().optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appName, setAppName] = useState('KRA ASSIST');
  const [appSlogan, setAppSlogan] = useState('Simple accounting & tax compliance for Kenyan SMEs');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [isIdleLogout, setIsIdleLogout] = useState(false);
  const [loginBrandingImage, setLoginBrandingImage] = useState<string | null>(null);
  const [loginBackgroundType, setLoginBackgroundType] = useState<'gradient' | 'solid' | 'image'>('gradient');
  const [loginBackgroundColor, setLoginBackgroundColor] = useState('#1e40af');
  const [loginBackgroundImage, setLoginBackgroundImage] = useState<string | null>(null);
  const [loginHeadline, setLoginHeadline] = useState('Manage Your Business Finances');
  const [loginSubheadline, setLoginSubheadline] = useState('Track sales, expenses, VAT, and stay compliant with KRA regulations - all in one place.');
  const [loginFeatures, setLoginFeatures] = useState([
    { title: '📊 Real-time Reports', desc: 'VAT, Sales & Expenses' },
    { title: '🧾 Easy Invoicing', desc: 'Create & send invoices' },
    { title: '📱 POS System', desc: 'Built-in point of sale' },
    { title: '🔔 Reminders', desc: 'Never miss deadlines' },
  ]);
  
  const { signIn, signUp, user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for remembered email and idle logout on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const idleLogout = sessionStorage.getItem('idleLogout');
    
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberEmail(true);
    }
    
    if (idleLogout === 'true') {
      setIsIdleLogout(true);
      sessionStorage.removeItem('idleLogout');
      toast({
        title: "Session expired",
        description: "You were logged out due to inactivity. Please enter your password to continue.",
      });
    }
  }, [toast]);

  // Fetch app settings
  useEffect(() => {
    const fetchAppSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('key, value');

        if (error) throw error;

        const getValue = (key: string) => data?.find(s => s.key === key)?.value || null;

        if (getValue('app_logo')) setAppLogo(getValue('app_logo'));
        if (getValue('app_name')) setAppName(getValue('app_name')!);
        if (getValue('app_slogan')) setAppSlogan(getValue('app_slogan')!);
        if (getValue('login_image')) setLoginBrandingImage(getValue('login_image'));
        if (getValue('login_bg_type')) setLoginBackgroundType(getValue('login_bg_type') as 'gradient' | 'solid' | 'image');
        if (getValue('login_bg_color')) setLoginBackgroundColor(getValue('login_bg_color')!);
        if (getValue('login_bg_image')) setLoginBackgroundImage(getValue('login_bg_image'));
        if (getValue('login_headline')) setLoginHeadline(getValue('login_headline')!);
        if (getValue('login_subheadline')) setLoginSubheadline(getValue('login_subheadline')!);

        // Fetch features
        const features = [
          { title: getValue('login_feature1_title') || '📊 Real-time Reports', desc: getValue('login_feature1_desc') || 'VAT, Sales & Expenses' },
          { title: getValue('login_feature2_title') || '🧾 Easy Invoicing', desc: getValue('login_feature2_desc') || 'Create & send invoices' },
          { title: getValue('login_feature3_title') || '📱 POS System', desc: getValue('login_feature3_desc') || 'Built-in point of sale' },
          { title: getValue('login_feature4_title') || '🔔 Reminders', desc: getValue('login_feature4_desc') || 'Never miss deadlines' },
        ];
        setLoginFeatures(features);
      } catch (error) {
        console.error('Error fetching app settings:', error);
      }
    };
    fetchAppSettings();
  }, []);

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        signupSchema.parse({ email, password, businessName, phoneNumber });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Login failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Handle remember email
          if (rememberEmail) {
            localStorage.setItem('rememberedEmail', email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }
          
          setIsIdleLogout(false);
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          navigate('/dashboard');
        }
      } else {
        const { error } = await signUp(email, password, {
          business_name: businessName,
          phone_number: phoneNumber,
        });
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please login instead.",
              variant: "destructive",
            });
            setIsLogin(true);
          } else {
            toast({
              title: "Signup failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account created!",
            description: "Please check your email to verify your account.",
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background to-muted/30">
      {/* Left Column - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 lg:px-8">
        {/* Logo/Brand */}
        <div className="mb-8 text-center">
          {appLogo ? (
            <img 
              src={appLogo} 
              alt={appName} 
              className="max-w-[200px] max-h-24 w-auto h-auto mx-auto mb-4 object-contain" 
            />
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">{appName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {appSlogan}
          </p>
        </div>

        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">
              {isIdleLogout ? 'Welcome back' : isLogin ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription>
              {isIdleLogout 
                ? 'Enter your password to continue' 
                : isLogin 
                  ? 'Sign in to manage your business finances' 
                  : 'Start managing your business finances today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="businessName"
                        type="text"
                        placeholder="e.g. Mama Mboga Shop"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.businessName && (
                      <p className="text-sm text-destructive">{errors.businessName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number (optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="e.g. 0712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="pl-10"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting || (isIdleLogout && rememberEmail)}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isSubmitting}
                    autoFocus={isIdleLogout}
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {isLogin && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberEmail"
                    checked={rememberEmail}
                    onCheckedChange={(checked) => setRememberEmail(checked === true)}
                  />
                  <Label htmlFor="rememberEmail" className="text-sm font-normal cursor-pointer">
                    Remember my email
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                  setIsIdleLogout(false);
                }}
                className="text-sm text-primary hover:underline"
                disabled={isSubmitting}
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center space-y-3">
          <button
            type="button"
            onClick={() => navigate('/pricing')}
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
          >
            View Pricing Plans →
          </button>
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Admin Login
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Right Column - Branding Image (desktop only) */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-8"
        style={{
          background: loginBackgroundType === 'solid' 
            ? loginBackgroundColor 
            : loginBackgroundType === 'image' && loginBackgroundImage
              ? `url(${loginBackgroundImage}) center/cover`
              : 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))'
        }}
      >
        {loginBrandingImage ? (
          <img 
            src={loginBrandingImage} 
            alt="Branding" 
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
          />
        ) : (
          <div className="text-center max-w-md">
            <div className="w-32 h-32 mx-auto mb-8 rounded-3xl gradient-primary flex items-center justify-center">
              <Building2 className="h-16 w-16 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {loginHeadline}
            </h2>
            <p className="text-lg text-muted-foreground">
              {loginSubheadline}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-left">
              {loginFeatures.map((feature, index) => (
                <div key={index} className="p-4 rounded-xl bg-card/50 backdrop-blur">
                  <p className="font-semibold text-foreground">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
