import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, GripVertical, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  features: string[];
  is_active: boolean;
  is_highlighted: boolean;
  badge: string | null;
  sort_order: number;
}

interface PlanFormData {
  plan_key: string;
  name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  features: string;
  is_active: boolean;
  is_highlighted: boolean;
  badge: string;
}

const defaultFormData: PlanFormData = {
  plan_key: '',
  name: '',
  description: '',
  monthly_price: 0,
  annual_price: 0,
  features: '',
  is_active: true,
  is_highlighted: false,
  badge: '',
};

export function AdminPricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Parse features from JSON and ensure string array
      const parsedPlans: PricingPlan[] = (data || []).map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) 
          ? (plan.features as unknown[]).map(f => String(f))
          : [],
      }));
      
      setPlans(parsedPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to fetch pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedPlan(null);
    setFormData({
      ...defaultFormData,
      monthly_price: 0,
      annual_price: 0,
    });
    setEditDialogOpen(true);
  };

  const openEditDialog = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setFormData({
      plan_key: plan.plan_key,
      name: plan.name,
      description: plan.description || '',
      monthly_price: plan.monthly_price,
      annual_price: plan.annual_price,
      features: plan.features.join('\n'),
      is_active: plan.is_active,
      is_highlighted: plan.is_highlighted,
      badge: plan.badge || '',
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.plan_key || !formData.name) {
      toast.error('Plan key and name are required');
      return;
    }

    setSaving(true);
    try {
      const features = formData.features.split('\n').filter(f => f.trim());
      
      const planData = {
        plan_key: formData.plan_key.toLowerCase().replace(/\s+/g, '_'),
        name: formData.name,
        description: formData.description || null,
        monthly_price: formData.monthly_price,
        annual_price: formData.annual_price,
        features: features,
        is_active: formData.is_active,
        is_highlighted: formData.is_highlighted,
        badge: formData.badge || null,
      };

      if (selectedPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('pricing_plans')
          .update(planData)
          .eq('id', selectedPlan.id);

        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        // Create new plan
        const maxOrder = Math.max(...plans.map(p => p.sort_order), 0);
        const { error } = await supabase
          .from('pricing_plans')
          .insert({ ...planData, sort_order: maxOrder + 1 });

        if (error) throw error;
        toast.success('Plan created successfully');
      }

      setEditDialogOpen(false);
      fetchPlans();
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast.error(error.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('pricing_plans')
        .delete()
        .eq('id', selectedPlan.id);

      if (error) throw error;

      toast.success('Plan deleted successfully');
      setDeleteDialogOpen(false);
      fetchPlans();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast.error(error.message || 'Failed to delete plan');
    } finally {
      setSaving(false);
    }
  };

  const togglePlanActive = async (plan: PricingPlan) => {
    try {
      const { error } = await supabase
        .from('pricing_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      
      toast.success(`Plan ${!plan.is_active ? 'activated' : 'deactivated'}`);
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const toggleHighlighted = async (plan: PricingPlan) => {
    try {
      // If highlighting this plan, remove highlight from others
      if (!plan.is_highlighted) {
        await supabase
          .from('pricing_plans')
          .update({ is_highlighted: false })
          .neq('id', plan.id);
      }

      const { error } = await supabase
        .from('pricing_plans')
        .update({ is_highlighted: !plan.is_highlighted })
        .eq('id', plan.id);

      if (error) throw error;
      
      toast.success(`Plan ${!plan.is_highlighted ? 'highlighted' : 'unhighlighted'}`);
      fetchPlans();
    } catch (error) {
      console.error('Error toggling highlight:', error);
      toast.error('Failed to update plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pricing Plans Management</CardTitle>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="text-right">Monthly (KES)</TableHead>
                  <TableHead className="text-right">Annual (KES)</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">Highlight</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No pricing plans found. Create your first plan.
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan, index) => (
                    <TableRow key={plan.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{plan.name}</span>
                          {plan.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {plan.badge}
                            </Badge>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                            {plan.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {plan.plan_key}
                        </code>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {plan.monthly_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {plan.annual_price.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {plan.features.length} features
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={plan.is_active}
                          onCheckedChange={() => togglePlanActive(plan)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant={plan.is_highlighted ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleHighlighted(plan)}
                        >
                          <Star className={`h-4 w-4 ${plan.is_highlighted ? 'fill-current' : ''}`} />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDeleteDialog(plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Business"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan_key">Plan Key *</Label>
                <Input
                  id="plan_key"
                  value={formData.plan_key}
                  onChange={(e) => setFormData({ ...formData, plan_key: e.target.value })}
                  placeholder="e.g., business"
                  disabled={!!selectedPlan}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier (cannot be changed later)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the plan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_price">Monthly Price (KES) *</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annual_price">Annual Price (KES)</Label>
                <Input
                  id="annual_price"
                  type="number"
                  value={formData.annual_price}
                  onChange={(e) => setFormData({ ...formData, annual_price: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
                <p className="text-xs text-muted-foreground">
                  Monthly equivalent: KES {Math.round(formData.annual_price / 12).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="badge">Badge Text (optional)</Label>
              <Input
                id="badge"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="e.g., Most Popular"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_highlighted"
                  checked={formData.is_highlighted}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_highlighted: checked })}
                />
                <Label htmlFor="is_highlighted">Highlighted (recommended)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : selectedPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete the <strong>{selectedPlan?.name}</strong> plan?</p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. Users currently on this plan will not be affected but no new subscriptions can be made.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
