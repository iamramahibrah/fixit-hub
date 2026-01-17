import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Home, Briefcase, ShoppingBag, CreditCard, Mail, 
  Save, Loader2, Upload, X, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PageContent {
  id?: string;
  page_name: string;
  section_key: string;
  content_type: string;
  content_value: string | null;
  is_active: boolean;
}

const pages = [
  { id: 'home', label: 'Home', icon: Home, path: '/home' },
  { id: 'services', label: 'Services', icon: Briefcase, path: '/services' },
  { id: 'catalog', label: 'Catalog', icon: ShoppingBag, path: '/catalog' },
  { id: 'pricing', label: 'Pricing', icon: CreditCard, path: '/pricing' },
  { id: 'contact', label: 'Contact', icon: Mail, path: '/contact' },
];

const pageConfigs: Record<string, { key: string; label: string; type: 'text' | 'textarea' | 'image' }[]> = {
  home: [
    { key: 'hero_badge', label: 'Hero Badge Text', type: 'text' },
    { key: 'hero_title', label: 'Hero Title', type: 'textarea' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
    { key: 'cta_title', label: 'CTA Section Title', type: 'text' },
    { key: 'cta_subtitle', label: 'CTA Section Subtitle', type: 'textarea' },
  ],
  services: [
    { key: 'hero_title', label: 'Hero Title', type: 'text' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
    { key: 'cta_title', label: 'CTA Section Title', type: 'text' },
    { key: 'cta_subtitle', label: 'CTA Section Subtitle', type: 'textarea' },
  ],
  catalog: [
    { key: 'hero_title', label: 'Hero Title', type: 'text' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
    { key: 'cta_title', label: 'CTA Section Title', type: 'text' },
    { key: 'cta_subtitle', label: 'CTA Section Subtitle', type: 'textarea' },
  ],
  pricing: [
    { key: 'hero_title', label: 'Hero Title', type: 'text' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
  ],
  contact: [
    { key: 'hero_title', label: 'Hero Title', type: 'text' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
    { key: 'contact_email', label: 'Contact Email', type: 'text' },
    { key: 'contact_phone', label: 'Contact Phone', type: 'text' },
    { key: 'contact_address', label: 'Contact Address', type: 'textarea' },
  ],
};

export function AdminPageContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [content, setContent] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('public_page_content')
        .select('*');

      if (error) throw error;

      // Organize content by page
      const organized: Record<string, Record<string, string>> = {};
      (data || []).forEach(item => {
        if (!organized[item.page_name]) {
          organized[item.page_name] = {};
        }
        organized[item.page_name][item.section_key] = item.content_value || '';
      });

      setContent(organized);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast.error('Failed to load page content');
    } finally {
      setLoading(false);
    }
  };

  const updateContent = (page: string, key: string, value: string) => {
    setContent(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const savePageContent = async (pageName: string) => {
    setSaving(true);
    try {
      const pageContent = content[pageName] || {};
      const updates = Object.entries(pageContent).map(([key, value]) => ({
        page_name: pageName,
        section_key: key,
        content_type: 'text',
        content_value: value || null,
        is_active: true,
      }));

      // Upsert all content for this page
      for (const update of updates) {
        const { error } = await supabase
          .from('public_page_content')
          .upsert(update, { onConflict: 'page_name,section_key' });

        if (error) throw error;
      }

      toast.success(`${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page content saved`);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const openPage = (path: string) => {
    window.open(path, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Page Content Management
          </CardTitle>
          <CardDescription>
            Customize the content displayed on your public-facing pages
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          {pages.map(page => {
            const Icon = page.icon;
            return (
              <TabsTrigger key={page.id} value={page.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{page.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          pages.map(page => (
            <TabsContent key={page.id} value={page.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{page.label} Page</CardTitle>
                      <CardDescription>
                        Edit the content sections for the {page.label.toLowerCase()} page
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPage(page.path)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => savePageContent(page.id)}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {pageConfigs[page.id]?.map(field => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={content[page.id]?.[field.key] || ''}
                          onChange={(e) => updateContent(page.id, field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          rows={3}
                        />
                      ) : (
                        <Input
                          value={content[page.id]?.[field.key] || ''}
                          onChange={(e) => updateContent(page.id, field.key, e.target.value)}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))}

                  {(!pageConfigs[page.id] || pageConfigs[page.id].length === 0) && (
                    <p className="text-muted-foreground text-center py-8">
                      No customizable sections configured for this page yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))
        )}
      </Tabs>
    </div>
  );
}