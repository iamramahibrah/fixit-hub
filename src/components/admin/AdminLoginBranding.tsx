import { useState, useEffect, useRef } from 'react';
import { 
  Palette, Upload, Trash2, Check, Loader2, Image as ImageIcon, 
  Type, Layout, Eye, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LoginBrandingSettings {
  appLogo: string | null;
  appName: string;
  appSlogan: string;
  loginImage: string | null;
  loginBackgroundType: 'gradient' | 'solid' | 'image';
  loginBackgroundColor: string;
  loginBackgroundGradient: string;
  loginBackgroundImage: string | null;
  loginHeadline: string;
  loginSubheadline: string;
  loginFeature1Title: string;
  loginFeature1Desc: string;
  loginFeature2Title: string;
  loginFeature2Desc: string;
  loginFeature3Title: string;
  loginFeature3Desc: string;
  loginFeature4Title: string;
  loginFeature4Desc: string;
}

const defaultSettings: LoginBrandingSettings = {
  appLogo: null,
  appName: 'KRA ASSIST',
  appSlogan: 'Simple accounting & tax compliance for Kenyan SMEs',
  loginImage: null,
  loginBackgroundType: 'gradient',
  loginBackgroundColor: '#1e40af',
  loginBackgroundGradient: 'from-primary/10 to-primary/5',
  loginBackgroundImage: null,
  loginHeadline: 'Manage Your Business Finances',
  loginSubheadline: 'Track sales, expenses, VAT, and stay compliant with KRA regulations - all in one place.',
  loginFeature1Title: '📊 Real-time Reports',
  loginFeature1Desc: 'VAT, Sales & Expenses',
  loginFeature2Title: '🧾 Easy Invoicing',
  loginFeature2Desc: 'Create & send invoices',
  loginFeature3Title: '📱 POS System',
  loginFeature3Desc: 'Built-in point of sale',
  loginFeature4Title: '🔔 Reminders',
  loginFeature4Desc: 'Never miss deadlines',
};

export function AdminLoginBranding() {
  const [settings, setSettings] = useState<LoginBrandingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const loginImageInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const getValue = (key: string, defaultVal: string) => 
        data?.find(s => s.key === key)?.value || defaultVal;

      setSettings({
        appLogo: getValue('app_logo', '') || null,
        appName: getValue('app_name', defaultSettings.appName),
        appSlogan: getValue('app_slogan', defaultSettings.appSlogan),
        loginImage: getValue('login_image', '') || null,
        loginBackgroundType: (getValue('login_bg_type', 'gradient') as 'gradient' | 'solid' | 'image'),
        loginBackgroundColor: getValue('login_bg_color', defaultSettings.loginBackgroundColor),
        loginBackgroundGradient: getValue('login_bg_gradient', defaultSettings.loginBackgroundGradient),
        loginBackgroundImage: getValue('login_bg_image', '') || null,
        loginHeadline: getValue('login_headline', defaultSettings.loginHeadline),
        loginSubheadline: getValue('login_subheadline', defaultSettings.loginSubheadline),
        loginFeature1Title: getValue('login_feature1_title', defaultSettings.loginFeature1Title),
        loginFeature1Desc: getValue('login_feature1_desc', defaultSettings.loginFeature1Desc),
        loginFeature2Title: getValue('login_feature2_title', defaultSettings.loginFeature2Title),
        loginFeature2Desc: getValue('login_feature2_desc', defaultSettings.loginFeature2Desc),
        loginFeature3Title: getValue('login_feature3_title', defaultSettings.loginFeature3Title),
        loginFeature3Desc: getValue('login_feature3_desc', defaultSettings.loginFeature3Desc),
        loginFeature4Title: getValue('login_feature4_title', defaultSettings.loginFeature4Title),
        loginFeature4Desc: getValue('login_feature4_desc', defaultSettings.loginFeature4Desc),
      });
    } catch (error) {
      console.error('Error fetching login branding settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    key: string,
    fileName: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Please upload an image smaller than 5MB');
      return;
    }

    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const fileExt = file.name.split('.').pop();
      const fullFileName = `${fileName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fullFileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fullFileName);

      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from('app_settings')
        .upsert({ key, value: cacheBustedUrl }, { onConflict: 'key' });

      setSettings(prev => ({ ...prev, [getSettingsKey(key)]: cacheBustedUrl }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
    }
  };

  const getSettingsKey = (dbKey: string): keyof LoginBrandingSettings => {
    const mapping: Record<string, keyof LoginBrandingSettings> = {
      'app_logo': 'appLogo',
      'login_image': 'loginImage',
      'login_bg_image': 'loginBackgroundImage',
    };
    return mapping[dbKey] || 'appLogo';
  };

  const handleDeleteImage = async (key: string, fileNames: string[]) => {
    try {
      await supabase.storage.from('logos').remove(fileNames);

      await supabase
        .from('app_settings')
        .update({ value: null })
        .eq('key', key);

      setSettings(prev => ({ ...prev, [getSettingsKey(key)]: null }));
      toast.success('Image removed');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const handleSaveSetting = async (key: string, value: string) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await supabase
        .from('app_settings')
        .upsert({ key, value }, { onConflict: 'key' });

      toast.success('Setting saved successfully');
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to save setting');
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveAllSettings = async () => {
    setSaving(prev => ({ ...prev, all: true }));
    try {
      const settingsToSave = [
        { key: 'app_name', value: settings.appName },
        { key: 'app_slogan', value: settings.appSlogan },
        { key: 'login_bg_type', value: settings.loginBackgroundType },
        { key: 'login_bg_color', value: settings.loginBackgroundColor },
        { key: 'login_bg_gradient', value: settings.loginBackgroundGradient },
        { key: 'login_headline', value: settings.loginHeadline },
        { key: 'login_subheadline', value: settings.loginSubheadline },
        { key: 'login_feature1_title', value: settings.loginFeature1Title },
        { key: 'login_feature1_desc', value: settings.loginFeature1Desc },
        { key: 'login_feature2_title', value: settings.loginFeature2Title },
        { key: 'login_feature2_desc', value: settings.loginFeature2Desc },
        { key: 'login_feature3_title', value: settings.loginFeature3Title },
        { key: 'login_feature3_desc', value: settings.loginFeature3Desc },
        { key: 'login_feature4_title', value: settings.loginFeature4Title },
        { key: 'login_feature4_desc', value: settings.loginFeature4Desc },
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from('app_settings')
          .upsert(setting, { onConflict: 'key' });
      }

      toast.success('All branding settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(prev => ({ ...prev, all: false }));
    }
  };

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
          <Palette className="h-5 w-5" />
          Login Page Branding
        </CardTitle>
        <CardDescription>
          Customize the login page appearance including logo, images, background, and content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="logo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="logo" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Logo
            </TabsTrigger>
            <TabsTrigger value="sidebar" className="gap-2">
              <Layout className="h-4 w-4" />
              Left Panel
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-2">
              <Type className="h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Logo Tab */}
          <TabsContent value="logo" className="space-y-6">
            <div className="space-y-4">
              <Label>Company Logo</Label>
              <div className="flex items-start gap-4">
                <div 
                  className="relative w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer overflow-hidden bg-muted/50 flex items-center justify-center"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {settings.appLogo ? (
                    <img 
                      src={settings.appLogo} 
                      alt="Company logo" 
                      className="max-w-full max-h-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-xs">Add Logo</span>
                    </div>
                  )}
                  {uploading['app_logo'] && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'app_logo', 'app-logo')}
                  className="hidden"
                />
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading['app_logo']}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {settings.appLogo ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  {settings.appLogo && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteImage('app_logo', ['app-logo.png', 'app-logo.jpg', 'app-logo.jpeg', 'app-logo.webp'])}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">Max 5MB, any size. Will scale proportionally.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <div className="flex gap-2">
                <Input
                  id="appName"
                  value={settings.appName}
                  onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  placeholder="KRA ASSIST"
                />
                <Button 
                  onClick={() => handleSaveSetting('app_name', settings.appName)} 
                  disabled={saving['app_name']}
                >
                  {saving['app_name'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appSlogan">App Slogan</Label>
              <div className="flex gap-2">
                <Input
                  id="appSlogan"
                  value={settings.appSlogan}
                  onChange={(e) => setSettings({ ...settings, appSlogan: e.target.value })}
                  placeholder="Your tagline here"
                />
                <Button 
                  onClick={() => handleSaveSetting('app_slogan', settings.appSlogan)} 
                  disabled={saving['app_slogan']}
                >
                  {saving['app_slogan'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Left Panel Tab */}
          <TabsContent value="sidebar" className="space-y-6">
            <div className="space-y-4">
              <Label>Left Panel Image (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Upload a custom image for the left side of the login page. If no image is uploaded, the default feature cards will be shown.
              </p>
              <div className="flex items-start gap-4">
                <div 
                  className="relative w-48 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer overflow-hidden bg-muted/50 flex items-center justify-center"
                  onClick={() => loginImageInputRef.current?.click()}
                >
                  {settings.loginImage ? (
                    <img 
                      src={settings.loginImage} 
                      alt="Login branding" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-xs">Add Image</span>
                    </div>
                  )}
                  {uploading['login_image'] && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                </div>
                <input
                  ref={loginImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'login_image', 'login-branding')}
                  className="hidden"
                />
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => loginImageInputRef.current?.click()}
                    disabled={uploading['login_image']}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {settings.loginImage ? 'Change Image' : 'Upload Image'}
                  </Button>
                  {settings.loginImage && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteImage('login_image', ['login-branding.png', 'login-branding.jpg', 'login-branding.jpeg', 'login-branding.webp'])}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">Recommended: 800x600 or larger</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Background Type</Label>
              <Select
                value={settings.loginBackgroundType}
                onValueChange={async (value: 'gradient' | 'solid' | 'image') => {
                  setSettings({ ...settings, loginBackgroundType: value });
                  // Auto-save background type when changed
                  await handleSaveSetting('login_bg_type', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="image">Background Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.loginBackgroundType === 'solid' && (
              <div className="space-y-2">
                <Label htmlFor="bgColor">Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="bgColor"
                    type="color"
                    value={settings.loginBackgroundColor}
                    onChange={(e) => setSettings({ ...settings, loginBackgroundColor: e.target.value })}
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={settings.loginBackgroundColor}
                    onChange={(e) => setSettings({ ...settings, loginBackgroundColor: e.target.value })}
                    placeholder="#1e40af"
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleSaveSetting('login_bg_color', settings.loginBackgroundColor)} 
                    disabled={saving['login_bg_color']}
                    size="icon"
                  >
                    {saving['login_bg_color'] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {settings.loginBackgroundType === 'image' && (
              <div className="space-y-4">
                <Label>Background Image</Label>
                <div className="flex items-start gap-4">
                  <div 
                    className="relative w-48 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer overflow-hidden bg-muted/50 flex items-center justify-center"
                    onClick={() => bgImageInputRef.current?.click()}
                  >
                    {settings.loginBackgroundImage ? (
                      <img 
                        src={settings.loginBackgroundImage} 
                        alt="Background" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-8 h-8 mb-1" />
                        <span className="text-xs">Add Background</span>
                      </div>
                    )}
                    {uploading['login_bg_image'] && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={bgImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'login_bg_image', 'login-background')}
                    className="hidden"
                  />
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => bgImageInputRef.current?.click()}
                      disabled={uploading['login_bg_image']}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {settings.loginBackgroundImage ? 'Change' : 'Upload'}
                    </Button>
                    {settings.loginBackgroundImage && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteImage('login_bg_image', ['login-background.png', 'login-background.jpg', 'login-background.jpeg', 'login-background.webp'])}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={settings.loginHeadline}
                onChange={(e) => setSettings({ ...settings, loginHeadline: e.target.value })}
                placeholder="Manage Your Business Finances"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subheadline">Subheadline</Label>
              <Textarea
                id="subheadline"
                value={settings.loginSubheadline}
                onChange={(e) => setSettings({ ...settings, loginSubheadline: e.target.value })}
                placeholder="Track sales, expenses, VAT, and stay compliant..."
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <Label className="mb-4 block">Feature Cards (shown when no branding image is set)</Label>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="space-y-2 p-4 rounded-lg border border-border">
                    <Label>Feature {num} Title</Label>
                    <Input
                      value={settings[`loginFeature${num}Title` as keyof LoginBrandingSettings] as string}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        [`loginFeature${num}Title`]: e.target.value 
                      })}
                      placeholder="📊 Feature Title"
                    />
                    <Label>Feature {num} Description</Label>
                    <Input
                      value={settings[`loginFeature${num}Desc` as keyof LoginBrandingSettings] as string}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        [`loginFeature${num}Desc`]: e.target.value 
                      })}
                      placeholder="Short description"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleSaveAllSettings} 
              disabled={saving['all']}
              className="w-full"
            >
              {saving['all'] ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save All Content Settings
                </>
              )}
            </Button>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex min-h-[400px]">
                {/* Left side preview - Form */}
                <div className="flex-1 p-6 flex flex-col items-center justify-center bg-background">
                  <div className="text-center mb-4">
                    {settings.appLogo ? (
                      <img 
                        src={settings.appLogo} 
                        alt={settings.appName} 
                        className="max-w-[120px] max-h-16 w-auto h-auto mx-auto mb-2 object-contain" 
                      />
                    ) : (
                      <div className="w-12 h-12 mx-auto mb-2 rounded-xl gradient-primary flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-primary-foreground" />
                      </div>
                    )}
                    <h3 className="text-lg font-bold">{settings.appName}</h3>
                    <p className="text-xs text-muted-foreground">{settings.appSlogan}</p>
                  </div>
                  <div className="w-full max-w-[200px] space-y-2">
                    <div className="h-8 bg-muted rounded" />
                    <div className="h-8 bg-muted rounded" />
                    <div className="h-8 bg-primary rounded" />
                  </div>
                </div>

                {/* Right side preview - Branding */}
                <div 
                  className="flex-1 p-6 flex items-center justify-center"
                  style={{
                    background: settings.loginBackgroundType === 'solid' 
                      ? settings.loginBackgroundColor 
                      : settings.loginBackgroundType === 'image' && settings.loginBackgroundImage
                        ? `url(${settings.loginBackgroundImage}) center/cover`
                        : 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05))'
                  }}
                >
                  {settings.loginImage ? (
                    <img 
                      src={settings.loginImage} 
                      alt="Branding" 
                      className="max-w-full max-h-48 object-contain rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="text-center max-w-[250px]">
                      <h4 className="text-base font-bold mb-2">{settings.loginHeadline}</h4>
                      <p className="text-xs text-muted-foreground mb-4">{settings.loginSubheadline}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((num) => (
                          <div key={num} className="p-2 rounded bg-card/50 backdrop-blur text-left">
                            <p className="text-xs font-medium truncate">
                              {settings[`loginFeature${num}Title` as keyof LoginBrandingSettings]}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {settings[`loginFeature${num}Desc` as keyof LoginBrandingSettings]}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              This is a preview of how the login page will appear. Changes reflect immediately on the actual login page.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
