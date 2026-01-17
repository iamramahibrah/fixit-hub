import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings2, Plus, Edit, Trash2, Star, StarOff, Upload, X, 
  GripVertical, Loader2, Save, Server, HardDrive, Network, Cloud, 
  Shield, Code, Wrench, Monitor, Database, Lock, Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface ServiceOffering {
  id: string;
  title: string;
  description: string | null;
  icon_name: string | null;
  image_url: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  category: string;
}

const iconOptions = [
  { name: 'Server', icon: Server },
  { name: 'HardDrive', icon: HardDrive },
  { name: 'Network', icon: Network },
  { name: 'Cloud', icon: Cloud },
  { name: 'Shield', icon: Shield },
  { name: 'Code', icon: Code },
  { name: 'Wrench', icon: Wrench },
  { name: 'Monitor', icon: Monitor },
  { name: 'Database', icon: Database },
  { name: 'Lock', icon: Lock },
  { name: 'Globe', icon: Globe },
  { name: 'Settings2', icon: Settings2 },
];

const categoryOptions = [
  { value: 'ict', label: 'ICT Support' },
  { value: 'hardware', label: 'Hardware Support' },
  { value: 'general', label: 'General Services' },
];

export function AdminServicesManager() {
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceOffering | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon_name: 'Server',
    image_url: '',
    category: 'general',
    is_featured: false,
    is_active: true,
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('service_offerings')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      icon_name: 'Server',
      image_url: '',
      category: 'general',
      is_featured: false,
      is_active: true,
    });
    setEditingService(null);
  };

  const openAddDialog = () => {
    resetForm();
    setEditDialogOpen(true);
  };

  const openEditDialog = (service: ServiceOffering) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      description: service.description || '',
      icon_name: service.icon_name || 'Server',
      image_url: service.image_url || '',
      category: service.category,
      is_featured: service.is_featured,
      is_active: service.is_active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (service: ServiceOffering) => {
    setEditingService(service);
    setDeleteDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const fileName = `services/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('branding').getPublicUrl(data.path);
      setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveService = async () => {
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      if (editingService) {
        // Update existing
        const { error } = await supabase
          .from('service_offerings')
          .update({
            title: formData.title,
            description: formData.description || null,
            icon_name: formData.icon_name,
            image_url: formData.image_url || null,
            category: formData.category,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
          })
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success('Service updated');
      } else {
        // Create new
        const { error } = await supabase
          .from('service_offerings')
          .insert({
            title: formData.title,
            description: formData.description || null,
            icon_name: formData.icon_name,
            image_url: formData.image_url || null,
            category: formData.category,
            is_featured: formData.is_featured,
            is_active: formData.is_active,
            sort_order: services.length,
          });

        if (error) throw error;
        toast.success('Service created');
      }

      setEditDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async () => {
    if (!editingService) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('service_offerings')
        .delete()
        .eq('id', editingService.id);

      if (error) throw error;

      toast.success('Service deleted');
      setDeleteDialogOpen(false);
      resetForm();
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (service: ServiceOffering) => {
    try {
      const { error } = await supabase
        .from('service_offerings')
        .update({ is_featured: !service.is_featured })
        .eq('id', service.id);

      if (error) throw error;

      setServices(prev => prev.map(s =>
        s.id === service.id ? { ...s, is_featured: !s.is_featured } : s
      ));
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  const toggleActive = async (service: ServiceOffering) => {
    try {
      const { error } = await supabase
        .from('service_offerings')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;

      setServices(prev => prev.map(s =>
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      ));
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  const getIconComponent = (iconName: string | null) => {
    const iconOption = iconOptions.find(i => i.name === iconName);
    if (iconOption) {
      const IconComponent = iconOption.icon;
      return <IconComponent className="h-5 w-5" />;
    }
    return <Settings2 className="h-5 w-5" />;
  };

  const featuredCount = services.filter(s => s.is_featured).length;
  const activeCount = services.filter(s => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Services Management
              </CardTitle>
              <CardDescription>
                Manage ICT Support, Hardware Support, and other service offerings
              </CardDescription>
            </div>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Badge variant="outline">
              {featuredCount} featured
            </Badge>
            <Badge variant="outline">
              {activeCount} / {services.length} active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Icon</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map(service => (
                  <TableRow key={service.id} className={cn(!service.is_active && "opacity-50")}>
                    <TableCell>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {getIconComponent(service.icon_name)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.title}</p>
                        {service.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        service.category === 'ict' ? 'default' : 
                        service.category === 'hardware' ? 'secondary' : 
                        'outline'
                      }>
                        {categoryOptions.find(c => c.value === service.category)?.label || service.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFeatured(service)}
                        className={cn(service.is_featured && "text-warning")}
                      >
                        {service.is_featured ? (
                          <Star className="h-4 w-4 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={() => toggleActive(service)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(service)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Add New Service'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Managed ICT Support"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the service..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon_name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => {
                      const IconComponent = icon.icon;
                      return (
                        <SelectItem key={icon.name} value={icon.name}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {icon.name}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Service Image (Optional)</Label>
              {formData.image_url ? (
                <div className="relative inline-block">
                  <img
                    src={formData.image_url}
                    alt="Service"
                    className="w-32 h-24 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-32 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer",
                    "hover:border-primary hover:bg-muted/50 transition-colors",
                    uploadingImage && "opacity-50 pointer-events-none"
                  )}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Upload</span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                />
                <Label>Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveService} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingService ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{editingService?.title}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteService} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}