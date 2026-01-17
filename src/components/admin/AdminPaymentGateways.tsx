import { useState, useEffect } from 'react';
import { CreditCard, Smartphone, Shield, Check, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PaymentGatewaySettings {
  // M-Pesa Daraja
  mpesaEnabled: boolean;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaShortcode: string;
  mpesaPasskey: string;
  mpesaEnvironment: 'sandbox' | 'production';
  
  // Stripe
  stripeEnabled: boolean;
  stripePublishableKey: string;
  stripeSecretKey: string;
}

const defaultSettings: PaymentGatewaySettings = {
  mpesaEnabled: false,
  mpesaConsumerKey: '',
  mpesaConsumerSecret: '',
  mpesaShortcode: '',
  mpesaPasskey: '',
  mpesaEnvironment: 'sandbox',
  stripeEnabled: false,
  stripePublishableKey: '',
  stripeSecretKey: '',
};

export function AdminPaymentGateways() {
  const [settings, setSettings] = useState<PaymentGatewaySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch from a system settings table or admin profile
      // For now, we'll use environment variables or edge function secrets
      // In production, this would be stored securely
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      setLoading(false);
    }
  };

  const handleSave = async (gateway: 'mpesa' | 'stripe') => {
    setSaving(true);
    try {
      // Save settings to Supabase secrets or a secure admin settings table
      // This would typically be done via an edge function for security
      const { error } = await supabase.functions.invoke('admin-update-payment-settings', {
        body: {
          gateway,
          settings: gateway === 'mpesa' ? {
            enabled: settings.mpesaEnabled,
            consumerKey: settings.mpesaConsumerKey,
            consumerSecret: settings.mpesaConsumerSecret,
            shortcode: settings.mpesaShortcode,
            passkey: settings.mpesaPasskey,
            environment: settings.mpesaEnvironment,
          } : {
            enabled: settings.stripeEnabled,
            publishableKey: settings.stripePublishableKey,
            secretKey: settings.stripeSecretKey,
          }
        }
      });

      if (error) throw error;

      toast.success(`${gateway.charAt(0).toUpperCase() + gateway.slice(1)} settings saved successfully`);
    } catch (error: any) {
      console.error('Error saving payment settings:', error);
      toast.error(error.message || 'Failed to save settings. Edge function may need to be created.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SecretInput = ({ 
    id, 
    label, 
    value, 
    onChange, 
    placeholder 
  }: { 
    id: string; 
    label: string; 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showSecrets[id] ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => toggleSecret(id)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showSecrets[id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Gateways
        </CardTitle>
        <CardDescription>
          Configure payment gateways to receive subscription payments from users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mpesa" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="mpesa" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              M-Pesa Daraja
            </TabsTrigger>
            <TabsTrigger value="stripe" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Stripe
            </TabsTrigger>
          </TabsList>

          {/* M-Pesa Tab */}
          <TabsContent value="mpesa" className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium">M-Pesa Daraja API</p>
                  <p className="text-sm text-muted-foreground">Accept mobile money payments from Kenya</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={settings.mpesaEnabled ? "default" : "secondary"} className={settings.mpesaEnabled ? "bg-success text-success-foreground" : ""}>
                  {settings.mpesaEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Switch
                  checked={settings.mpesaEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, mpesaEnabled: checked })}
                />
              </div>
            </div>

            <div className={cn("space-y-4", !settings.mpesaEnabled && "opacity-50 pointer-events-none")}>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-4 w-4 text-warning" />
                <p className="text-sm text-warning">
                  Get your API credentials from <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener noreferrer" className="underline">Safaricom Developer Portal</a>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm">Environment</Label>
                  <div className="flex gap-3 mt-2">
                    <Button
                      type="button"
                      variant={settings.mpesaEnvironment === 'sandbox' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings({ ...settings, mpesaEnvironment: 'sandbox' })}
                    >
                      Sandbox (Testing)
                    </Button>
                    <Button
                      type="button"
                      variant={settings.mpesaEnvironment === 'production' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSettings({ ...settings, mpesaEnvironment: 'production' })}
                    >
                      Production (Live)
                    </Button>
                  </div>
                </div>

                <SecretInput
                  id="mpesaConsumerKey"
                  label="Consumer Key"
                  value={settings.mpesaConsumerKey}
                  onChange={(v) => setSettings({ ...settings, mpesaConsumerKey: v })}
                  placeholder="Your M-Pesa consumer key"
                />
                <SecretInput
                  id="mpesaConsumerSecret"
                  label="Consumer Secret"
                  value={settings.mpesaConsumerSecret}
                  onChange={(v) => setSettings({ ...settings, mpesaConsumerSecret: v })}
                  placeholder="Your M-Pesa consumer secret"
                />
                <div className="space-y-2">
                  <Label htmlFor="mpesaShortcode" className="text-sm">Business Shortcode</Label>
                  <Input
                    id="mpesaShortcode"
                    value={settings.mpesaShortcode}
                    onChange={(e) => setSettings({ ...settings, mpesaShortcode: e.target.value })}
                    placeholder="e.g., 174379"
                  />
                </div>
                <SecretInput
                  id="mpesaPasskey"
                  label="Passkey"
                  value={settings.mpesaPasskey}
                  onChange={(v) => setSettings({ ...settings, mpesaPasskey: v })}
                  placeholder="Your M-Pesa passkey"
                />
              </div>

              <Button onClick={() => handleSave('mpesa')} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save M-Pesa Settings
              </Button>
            </div>
          </TabsContent>

          {/* Stripe Tab */}
          <TabsContent value="stripe" className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Stripe</p>
                  <p className="text-sm text-muted-foreground">Accept card payments worldwide</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={settings.stripeEnabled ? "default" : "secondary"} className={settings.stripeEnabled ? "bg-success text-success-foreground" : ""}>
                  {settings.stripeEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <Switch
                  checked={settings.stripeEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, stripeEnabled: checked })}
                />
              </div>
            </div>

            <div className={cn("space-y-4", !settings.stripeEnabled && "opacity-50 pointer-events-none")}>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertCircle className="h-4 w-4 text-warning" />
                <p className="text-sm text-warning">
                  Get your API keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard</a>
                </p>
              </div>

              <div className="space-y-4">
                <SecretInput
                  id="stripePublishableKey"
                  label="Publishable Key"
                  value={settings.stripePublishableKey}
                  onChange={(v) => setSettings({ ...settings, stripePublishableKey: v })}
                  placeholder="pk_live_..."
                />
                <SecretInput
                  id="stripeSecretKey"
                  label="Secret Key"
                  value={settings.stripeSecretKey}
                  onChange={(v) => setSettings({ ...settings, stripeSecretKey: v })}
                  placeholder="sk_live_..."
                />
              </div>

              <Button onClick={() => handleSave('stripe')} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save Stripe Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
