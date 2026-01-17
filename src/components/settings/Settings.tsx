import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CreditCard, Bell, User, ChevronRight, Check, LogOut, Shield, Mail, Phone, Camera, Upload, Trash2, FileCheck, Lock, Crown, CheckCircle, Key, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BusinessProfile } from '@/types';
import { BUSINESS_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { TccChecker } from '@/components/kra/TccChecker';
import { ChangePassword } from '@/components/settings/ChangePassword';
import { SubscriptionManagement } from '@/components/settings/SubscriptionManagement';
import { useSubscription } from '@/hooks/useSubscription';

interface SettingsProps {
  profile: BusinessProfile;
  onUpdateProfile: (updates: Partial<BusinessProfile>) => void;
  onBack: () => void;
}

export function Settings({ profile, onUpdateProfile, onBack }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editedProfile, setEditedProfile] = useState(profile);
  const [userEmail, setUserEmail] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscription = useSubscription(profile);
  
  // Check if user can access premium features (paid plan with active subscription)
  const canAccessPremiumFeatures = subscription.isPremium && subscription.isActive;

  // Get current user email
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const sections = [
    { id: 'business', label: 'Business Details', icon: Building2 },
    { id: 'subscription', label: 'Subscription Plans', icon: Sparkles },
    { id: 'payments', label: 'M-Pesa Settings', icon: CreditCard },
    { id: 'notifications', label: 'Reminders', icon: Bell },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'account', label: 'Account', icon: User },
  ];

  const handleSave = () => {
    onUpdateProfile(editedProfile);
    setActiveSection(null);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL with cache-busting timestamp
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      // Add timestamp to bust browser cache
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with logo URL
      setEditedProfile({ ...editedProfile, logoUrl: cacheBustedUrl });
      onUpdateProfile({ logoUrl: cacheBustedUrl });

      toast({
        title: "Logo uploaded",
        description: "Your business logo has been updated",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!user || !editedProfile.logoUrl) return;

    try {
      // Delete from storage
      const fileName = `${user.id}/logo`;
      await supabase.storage.from('logos').remove([`${fileName}.png`, `${fileName}.jpg`, `${fileName}.jpeg`, `${fileName}.webp`]);

      // Update profile
      setEditedProfile({ ...editedProfile, logoUrl: undefined });
      onUpdateProfile({ logoUrl: undefined });

      toast({
        title: "Logo removed",
        description: "Your business logo has been deleted",
      });
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete logo. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (activeSection === 'business') {
    return (
      <div className="pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setActiveSection(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Business Details</h1>
        </div>

        <div className="space-y-4">
          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-3">
            <Label className="self-start">Business Logo</Label>
            <div 
              className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer overflow-hidden bg-muted/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {editedProfile.logoUrl ? (
                <img 
                  src={editedProfile.logoUrl} 
                  alt="Business logo" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Camera className="w-8 h-8 mb-1" />
                  <span className="text-xs">Add Logo</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
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
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-1" />
                {editedProfile.logoUrl ? 'Change' : 'Upload'}
              </Button>
              {editedProfile.logoUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeleteLogo}
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Max 2MB, PNG/JPG/WebP</p>
          </div>

          <div>
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={editedProfile.businessName}
              onChange={(e) => setEditedProfile({ ...editedProfile, businessName: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="kraPin">KRA PIN</Label>
            <Input
              id="kraPin"
              value={editedProfile.kraPin}
              onChange={(e) => setEditedProfile({ ...editedProfile, kraPin: e.target.value })}
              placeholder="A123456789K"
            />
          </div>

          <div>
            <Label>Business Type</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEditedProfile({ ...editedProfile, businessType: type.value })}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    editedProfile.businessType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              VAT Registered
              <button
                type="button"
                onClick={() => setEditedProfile({ ...editedProfile, isVatRegistered: !editedProfile.isVatRegistered })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  editedProfile.isVatRegistered ? "bg-primary" : "bg-muted"
                )}
              >
                <div className={cn(
                  "absolute w-5 h-5 bg-card rounded-full top-0.5 transition-transform shadow-sm",
                  editedProfile.isVatRegistered ? "translate-x-6" : "translate-x-0.5"
                )} />
              </button>
            </Label>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={editedProfile.phone}
              onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={editedProfile.email}
              onChange={(e) => setEditedProfile({ ...editedProfile, email: e.target.value })}
            />
          </div>

          <Button onClick={handleSave} className="w-full" size="lg">
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    );
  }

  if (activeSection === 'subscription') {
    return (
      <SubscriptionManagement 
        profile={profile} 
        onUpdateProfile={onUpdateProfile} 
        onBack={() => setActiveSection(null)} 
      />
    );
  }

  if (activeSection === 'payments') {
    return (
      <div className="pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setActiveSection(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">M-Pesa Settings</h1>
        </div>

        <div className="space-y-4">
          <Card variant="default" className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Add your M-Pesa details to include them on all invoices
            </p>
          </Card>

          <div>
            <Label htmlFor="paybill">Paybill Number</Label>
            <Input
              id="paybill"
              value={editedProfile.mpesaPaybill || ''}
              onChange={(e) => setEditedProfile({ ...editedProfile, mpesaPaybill: e.target.value })}
              placeholder="e.g., 123456"
            />
          </div>

          <div>
            <Label htmlFor="till">Buy Goods Till Number</Label>
            <Input
              id="till"
              value={editedProfile.mpesaTillNumber || ''}
              onChange={(e) => setEditedProfile({ ...editedProfile, mpesaTillNumber: e.target.value })}
              placeholder="e.g., 987654"
            />
          </div>

          <Button onClick={handleSave} className="w-full" size="lg">
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    );
  }

  if (activeSection === 'security') {
    return (
      <div className="pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setActiveSection(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Security</h1>
        </div>

        <div className="space-y-4">
          <ChangePassword />
          
          {/* Security Tips */}
          <Card variant="default" className="p-4">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security Tips
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5" />
                Use a strong password with at least 8 characters
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5" />
                Don't share your login credentials with others
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5" />
                You'll be logged out after 15 minutes of inactivity
              </li>
            </ul>
          </Card>
        </div>
      </div>
    );
  }

  if (activeSection === 'account') {
    return (
      <div className="pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setActiveSection(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Account</h1>
        </div>

        <div className="space-y-4">
          {/* Account Info */}
          <Card variant="default" className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {profile.logoUrl ? (
                <img 
                  src={profile.logoUrl} 
                  alt="Business logo" 
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="p-3 rounded-full bg-primary/10">
                  <User className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">{profile.businessName || 'Your Business'}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
            </div>
          </Card>

          {/* Contact Info */}
          <Card variant="default" className="p-4 space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{profile.email || userEmail || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-foreground">{profile.phone || 'Not set'}</span>
              </div>
            </div>
          </Card>

          {/* Subscription Status */}
          <Card variant="gradient" className="p-4 bg-gradient-to-br from-primary to-primary/80">
            <div className="text-primary-foreground">
              {profile.subscriptionStatus === 'active' && profile.subscriptionPlan === 'pro' ? (
                <>
                  <p className="font-bold text-lg">Pro Plan</p>
                  <p className="text-sm opacity-90">
                    {profile.subscriptionEndsAt 
                      ? `Renews ${new Date(profile.subscriptionEndsAt).toLocaleDateString()}`
                      : 'Active subscription'}
                  </p>
                </>
              ) : profile.subscriptionStatus === 'active' && profile.subscriptionPlan === 'business' ? (
                <>
                  <p className="font-bold text-lg">Business Plan</p>
                  <p className="text-sm opacity-90">
                    {profile.subscriptionEndsAt 
                      ? `Renews ${new Date(profile.subscriptionEndsAt).toLocaleDateString()}`
                      : 'Active subscription'}
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/pricing')}>
                    Upgrade to Pro
                  </Button>
                </>
              ) : profile.subscriptionStatus === 'active' && profile.subscriptionPlan === 'starter' ? (
                <>
                  <p className="font-bold text-lg">Starter Plan</p>
                  <p className="text-sm opacity-90">
                    {profile.subscriptionEndsAt 
                      ? `Renews ${new Date(profile.subscriptionEndsAt).toLocaleDateString()}`
                      : 'Active subscription'}
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/pricing')}>
                    Upgrade to Pro
                  </Button>
                </>
              ) : profile.subscriptionStatus === 'expired' ? (
                <>
                  <p className="font-bold text-lg">Subscription Expired</p>
                  <p className="text-sm opacity-90">Your subscription has expired</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/pricing')}>
                    Renew Subscription
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-bold text-lg">Free Trial</p>
                  <p className="text-sm opacity-90">
                    {profile.trialEndsAt 
                      ? `Ends ${new Date(profile.trialEndsAt).toLocaleDateString()}`
                      : '14 days remaining'}
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/pricing')}>
                    Upgrade to Pro
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Business Details Summary */}
          <Card variant="default" className="p-4 space-y-3">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Business Name</span>
                <span className="text-foreground">{profile.businessName || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">KRA PIN</span>
                <span className="text-foreground">{profile.kraPin || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">VAT Registered</span>
                <span className="text-foreground">{profile.isVatRegistered ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Business Type</span>
                <span className="text-foreground capitalize">{profile.businessType || 'Not set'}</span>
              </div>
            </div>
          </Card>

          {/* Sign Out */}
          <Button 
            variant="outline" 
            onClick={handleSignOut} 
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            size="lg"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <Card
            key={section.id}
            variant="interactive"
            className="p-4"
            onClick={() => setActiveSection(section.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{section.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        ))}

        {/* Subscription Card */}
        <Card 
          variant="gradient" 
          className="p-4 mt-6 bg-gradient-to-br from-primary to-primary/80 cursor-pointer hover:opacity-95 transition-opacity"
          onClick={() => setActiveSection('subscription')}
        >
          <div className="text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                {profile.subscriptionStatus === 'active' && profile.subscriptionPlan === 'pro' ? (
                  <>
                    <p className="font-bold text-lg flex items-center gap-2">
                      Pro Plan
                      <Sparkles className="h-4 w-4" />
                    </p>
                    <p className="text-sm opacity-90">
                      {profile.subscriptionEndsAt 
                        ? `Renews ${new Date(profile.subscriptionEndsAt).toLocaleDateString()}`
                        : 'Active subscription'}
                    </p>
                  </>
                ) : profile.subscriptionStatus === 'active' && profile.subscriptionPlan === 'business' ? (
                  <>
                    <p className="font-bold text-lg">Business Plan</p>
                    <p className="text-sm opacity-90">
                      {profile.subscriptionEndsAt 
                        ? `Renews ${new Date(profile.subscriptionEndsAt).toLocaleDateString()}`
                        : 'Active subscription'}
                    </p>
                  </>
                ) : profile.subscriptionStatus === 'active' && profile.subscriptionPlan === 'starter' ? (
                  <>
                    <p className="font-bold text-lg">Starter Plan</p>
                    <p className="text-sm opacity-90">
                      {profile.subscriptionEndsAt 
                        ? `Renews ${new Date(profile.subscriptionEndsAt).toLocaleDateString()}`
                        : 'Active subscription'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg">Free Trial</p>
                    <p className="text-sm opacity-90">
                      {profile.trialEndsAt 
                        ? `Ends ${new Date(profile.trialEndsAt).toLocaleDateString()}`
                        : '14 days remaining'}
                    </p>
                  </>
                )}
              </div>
              <ChevronRight className="h-5 w-5 opacity-70" />
            </div>
            {profile.subscriptionPlan !== 'pro' && (
              <p className="text-xs opacity-80 mt-2">Tap to upgrade or change plan</p>
            )}
          </div>
        </Card>

        {/* Payment Integration API Keys */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Payment API Keys</p>
            {!canAccessPremiumFeatures && (
              <Badge variant="outline" className="text-xs gap-1">
                <Crown className="w-3 h-3" />
                Premium
              </Badge>
            )}
          </div>
          
          {!canAccessPremiumFeatures && (
            <Card className="p-4 border-dashed border-2 border-muted-foreground/20 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Upgrade Required</p>
                  <p className="text-xs text-muted-foreground">Payment gateway integrations are available on paid plans only.</p>
                </div>
                <Button size="sm" onClick={() => navigate('/pricing')}>
                  Upgrade
                </Button>
              </div>
            </Card>
          )}
          
          {/* Stripe API Keys */}
          <Card variant="default" className={cn("p-4", !canAccessPremiumFeatures && "opacity-60")}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-muted">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-medium text-foreground">Stripe</span>
                <p className="text-xs text-muted-foreground">Accept card payments worldwide</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="stripePublishable" className="text-xs">Publishable Key</Label>
                <Input
                  id="stripePublishable"
                  placeholder="pk_live_..."
                  value={editedProfile.stripePublishableKey || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, stripePublishableKey: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <div>
                <Label htmlFor="stripeSecret" className="text-xs">Secret Key</Label>
                <Input
                  id="stripeSecret"
                  type="password"
                  placeholder="sk_live_..."
                  value={editedProfile.stripeSecretKey || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, stripeSecretKey: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <Button onClick={handleSave} size="sm" className="w-full" disabled={!canAccessPremiumFeatures}>
                <Check className="w-4 h-4 mr-2" />
                Save Stripe Keys
              </Button>
            </div>
          </Card>

          {/* M-Pesa API Keys */}
          <Card variant="default" className={cn("p-4", !canAccessPremiumFeatures && "opacity-60")}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-muted">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-medium text-foreground">M-Pesa Daraja API</span>
                <p className="text-xs text-muted-foreground">Accept mobile money payments</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="mpesaConsumerKey" className="text-xs">Consumer Key</Label>
                <Input
                  id="mpesaConsumerKey"
                  placeholder="Your consumer key..."
                  value={editedProfile.mpesaConsumerKey || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, mpesaConsumerKey: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <div>
                <Label htmlFor="mpesaConsumerSecret" className="text-xs">Consumer Secret</Label>
                <Input
                  id="mpesaConsumerSecret"
                  type="password"
                  placeholder="Your consumer secret..."
                  value={editedProfile.mpesaConsumerSecret || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, mpesaConsumerSecret: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <div>
                <Label htmlFor="mpesaShortcode" className="text-xs">Business Shortcode</Label>
                <Input
                  id="mpesaShortcode"
                  placeholder="174379"
                  value={editedProfile.mpesaShortcode || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, mpesaShortcode: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <div>
                <Label htmlFor="mpesaPasskey" className="text-xs">Passkey</Label>
                <Input
                  id="mpesaPasskey"
                  type="password"
                  placeholder="Your passkey..."
                  value={editedProfile.mpesaPasskey || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, mpesaPasskey: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <Button onClick={handleSave} size="sm" className="w-full" disabled={!canAccessPremiumFeatures}>
                <Check className="w-4 h-4 mr-2" />
                Save M-Pesa Keys
              </Button>
            </div>
          </Card>

          {/* KRA eTIMS API Keys */}
          <Card variant="default" className={cn("p-4", !canAccessPremiumFeatures && "opacity-60")}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-medium text-foreground">KRA eTIMS Integration</span>
                <p className="text-xs text-muted-foreground">Submit invoices to Electronic Tax Invoice Management System</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="kraApiKey" className="text-xs">eTIMS API Key</Label>
                <Input
                  id="kraApiKey"
                  placeholder="Your eTIMS API key..."
                  value={editedProfile.kraApiKey || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, kraApiKey: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <div>
                <Label htmlFor="kraApiSecret" className="text-xs">eTIMS API Secret</Label>
                <Input
                  id="kraApiSecret"
                  type="password"
                  placeholder="Your eTIMS API secret..."
                  value={editedProfile.kraApiSecret || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, kraApiSecret: e.target.value })}
                  className="mt-1"
                  disabled={!canAccessPremiumFeatures}
                />
              </div>
              <Card className="p-3 bg-muted/50 border-dashed">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>How to get eTIMS API credentials:</strong>
                </p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Register on the KRA iTax portal</li>
                  <li>Apply for eTIMS integration access</li>
                  <li>Get your API credentials from the eTIMS portal</li>
                </ol>
                <a 
                  href="https://etims.kra.go.ke" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-primary underline mt-2 inline-block"
                >
                  Visit eTIMS Portal →
                </a>
              </Card>
              {editedProfile.kraApiKey && editedProfile.kraApiSecret && (
                <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-xs text-success">eTIMS credentials configured</span>
                </div>
              )}
              <Button onClick={handleSave} size="sm" className="w-full" disabled={!canAccessPremiumFeatures}>
                <Check className="w-4 h-4 mr-2" />
                Save eTIMS Credentials
              </Button>
            </div>
          </Card>

          {/* TCC Checker */}
          {canAccessPremiumFeatures && editedProfile.kraApiKey && editedProfile.kraApiSecret && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                Tax Compliance Verification
              </p>
              <TccChecker defaultPin={editedProfile.kraPin} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
