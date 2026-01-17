import { useState, useEffect, useRef } from 'react';
import { Settings, Upload, Trash2, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AppSettings {
  appLogo: string | null;
  appName: string;
}

export function AdminAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({ appLogo: null, appName: 'KRA ASSIST' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');

      if (error) throw error;

      const appLogo = data?.find(s => s.key === 'app_logo')?.value || null;
      const appName = data?.find(s => s.key === 'app_name')?.value || 'KRA ASSIST';

      setSettings({ appLogo, appName });
    } catch (error) {
      console.error('Error fetching app settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Please upload an image smaller than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `app-logo.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update app_settings table
      await supabase
        .from('app_settings')
        .upsert({ key: 'app_logo', value: cacheBustedUrl }, { onConflict: 'key' });

      setSettings({ ...settings, appLogo: cacheBustedUrl });
      toast.success('App logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      // Delete from storage
      await supabase.storage.from('logos').remove(['app-logo.png', 'app-logo.jpg', 'app-logo.jpeg', 'app-logo.webp']);

      // Update app_settings
      await supabase
        .from('app_settings')
        .update({ value: null })
        .eq('key', 'app_logo');

      setSettings({ ...settings, appLogo: null });
      toast.success('App logo removed');
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Failed to delete logo');
    }
  };

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await supabase
        .from('app_settings')
        .upsert({ key: 'app_name', value: settings.appName }, { onConflict: 'key' });

      toast.success('App name saved successfully');
    } catch (error) {
      console.error('Error saving app name:', error);
      toast.error('Failed to save app name');
    } finally {
      setSaving(false);
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
          <Settings className="h-5 w-5" />
          App Branding Settings
        </CardTitle>
        <CardDescription>
          Customize the app logo and name shown on the login and registration pages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Logo */}
        <div className="space-y-4">
          <Label>App Logo</Label>
          <div className="flex items-start gap-4">
            <div 
              className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer overflow-hidden bg-muted/50 flex items-center justify-center"
              onClick={() => fileInputRef.current?.click()}
            >
              {settings.appLogo ? (
                <img 
                  src={settings.appLogo} 
                  alt="App logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mb-1" />
                  <span className="text-xs">Add Logo</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {settings.appLogo ? 'Change Logo' : 'Upload Logo'}
              </Button>
              {settings.appLogo && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeleteLogo}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Max 2MB, PNG/JPG/WebP</p>
            </div>
          </div>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <Label htmlFor="appName">App Name</Label>
          <div className="flex gap-2">
            <Input
              id="appName"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              placeholder="KRA ASSIST"
            />
            <Button onClick={handleSaveName} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This name will appear on the login and registration pages
          </p>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t border-border">
          <Label className="mb-3 block">Preview</Label>
          <div className="flex flex-col items-center gap-2 p-6 rounded-lg bg-muted/30 border border-border">
            {settings.appLogo ? (
              <img src={settings.appLogo} alt="App logo" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                {settings.appName.charAt(0)}
              </div>
            )}
            <span className="text-xl font-bold">{settings.appName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}