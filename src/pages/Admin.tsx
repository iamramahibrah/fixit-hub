import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Search, Crown, Clock, Check, X, RefreshCw, Trash2, TrendingUp, DollarSign, ArrowUpRight, CreditCard, Receipt, Settings, Tag, Palette, Package, Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, addDays, addMonths, isPast, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AdminPaymentGateways } from '@/components/admin/AdminPaymentGateways';
import { PaymentTransactions } from '@/components/admin/PaymentTransactions';
import { AdminAppSettings } from '@/components/admin/AdminAppSettings';
import { AdminPricingPlans } from '@/components/admin/AdminPricingPlans';
import { AdminLoginBranding } from '@/components/admin/AdminLoginBranding';
import { AdminCatalogManager } from '@/components/admin/AdminCatalogManager';
import { AdminServicesManager } from '@/components/admin/AdminServicesManager';
import { AdminPageContent } from '@/components/admin/AdminPageContent';

interface UserProfile {
  id: string;
  user_id: string;
  business_name: string | null;
  phone_number: string | null;
  email: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editPlan, setEditPlan] = useState('');
  const [editStatus, setEditStatus] = useState('');

  useEffect(() => {
    if (!authLoading) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      setIsAdmin(true);
      fetchUsers();
    } catch (error) {
      console.error('Admin check error:', error);
      navigate('/');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setEditPlan(userProfile.subscription_plan || 'free_trial');
    setEditStatus(userProfile.subscription_status || 'trial');
    setEditDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUser) return;

    try {
      let subscriptionEndsAt = selectedUser.subscription_ends_at;
      let trialEndsAt = selectedUser.trial_ends_at;

      // Set subscription end date based on plan
      if (editStatus === 'active' && editPlan !== 'free_trial') {
        subscriptionEndsAt = addMonths(new Date(), 1).toISOString();
      } else if (editStatus === 'trial') {
        trialEndsAt = addDays(new Date(), 14).toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: editPlan as any,
          subscription_status: editStatus,
          subscription_ends_at: subscriptionEndsAt,
          trial_ends_at: trialEndsAt,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('Subscription updated successfully');
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
    }
  };

  const extendTrial = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          trial_ends_at: addDays(new Date(), 14).toISOString(),
          subscription_status: 'trial',
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Trial extended by 14 days');
      fetchUsers();
    } catch (error) {
      console.error('Error extending trial:', error);
      toast.error('Failed to extend trial');
    }
  };

  const openDeleteDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token');
      }

      const response = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: selectedUser.user_id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.business_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.phone_number?.includes(search) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: users.length,
    trial: users.filter(u => u.subscription_status === 'trial').length,
    active: users.filter(u => u.subscription_status === 'active').length,
    expired: users.filter(u => u.subscription_status === 'expired').length,
  };

  // Plan pricing in KES
  const planPrices = {
    starter: 500,
    business: 1200,
    pro: 2000,
  };

  // Subscription analytics
  const subscriptionAnalytics = useMemo(() => {
    const starterUsers = users.filter(u => u.subscription_plan === 'starter' && u.subscription_status === 'active');
    const businessUsers = users.filter(u => u.subscription_plan === 'business' && u.subscription_status === 'active');
    const proUsers = users.filter(u => u.subscription_plan === 'pro' && u.subscription_status === 'active');

    const revenueByPlan = [
      { name: 'Starter', users: starterUsers.length, revenue: starterUsers.length * planPrices.starter, fill: 'hsl(var(--muted-foreground))' },
      { name: 'Business', users: businessUsers.length, revenue: businessUsers.length * planPrices.business, fill: 'hsl(var(--primary))' },
      { name: 'Pro', users: proUsers.length, revenue: proUsers.length * planPrices.pro, fill: 'hsl(var(--warning))' },
    ];

    const totalMonthlyRevenue = revenueByPlan.reduce((sum, p) => sum + p.revenue, 0);

    // Monthly growth - last 6 months
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const newUsers = users.filter(u => {
        const createdAt = new Date(u.created_at);
        return isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
      }).length;

      const upgradedUsers = users.filter(u => {
        if (!u.subscription_ends_at || u.subscription_status !== 'active') return false;
        const subStart = new Date(u.subscription_ends_at);
        // Approximate subscription start by subtracting 1 month from end date
        const approxStart = subMonths(subStart, 1);
        return isWithinInterval(approxStart, { start: monthStart, end: monthEnd });
      }).length;

      monthlyGrowth.push({
        month: format(monthDate, 'MMM'),
        newUsers,
        upgrades: upgradedUsers,
      });
    }

    return { revenueByPlan, totalMonthlyRevenue, monthlyGrowth };
  }, [users]);

  // Plan distribution for pie chart
  const planDistribution = useMemo(() => {
    return [
      { name: 'Trial', value: users.filter(u => u.subscription_plan === 'free_trial' || !u.subscription_plan).length, fill: 'hsl(var(--muted-foreground))' },
      { name: 'Starter', value: users.filter(u => u.subscription_plan === 'starter').length, fill: 'hsl(var(--secondary))' },
      { name: 'Business', value: users.filter(u => u.subscription_plan === 'business').length, fill: 'hsl(var(--primary))' },
      { name: 'Pro', value: users.filter(u => u.subscription_plan === 'pro').length, fill: 'hsl(var(--warning))' },
    ].filter(p => p.value > 0);
  }, [users]);

  const getPlanBadge = (plan: string | null) => {
    switch (plan) {
      case 'starter':
        return <Badge variant="secondary">Starter</Badge>;
      case 'business':
        return <Badge className="bg-primary/20 text-primary">Business</Badge>;
      case 'pro':
        return <Badge className="bg-warning/20 text-warning">Pro</Badge>;
      default:
        return <Badge variant="outline">Trial</Badge>;
    }
  };

  const getStatusBadge = (status: string | null, trialEnds: string | null, plan: string | null) => {
    if (status === 'trial' && trialEnds && isPast(new Date(trialEnds))) {
      return <Badge variant="destructive">Trial Expired</Badge>;
    }
    
    // Show subscription status with plan name for active users
    if (status === 'active' && plan && plan !== 'free_trial') {
      const planName = plan === 'starter' ? 'Starter' : plan === 'business' ? 'Business' : plan === 'pro' ? 'Pro' : plan;
      return <Badge className="bg-success/20 text-success">Subscribed on {planName}</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-success/20 text-success">Active</Badge>;
      case 'trial':
        return <Badge variant="outline">Trial</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-warning" />
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Catalog
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Gateways
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.trial}</p>
                  <p className="text-xs text-muted-foreground">On Trial</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-success/10 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-success" />
                <div>
                  <p className="text-2xl font-bold text-success">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <X className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-destructive">{stats.expired}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-primary">KES {subscriptionAnalytics.totalMonthlyRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue by Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue by Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptionAnalytics.revenueByPlan.map((plan) => (
                  <div key={plan.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge variant={plan.name === 'Starter' ? 'secondary' : plan.name === 'Business' ? 'default' : 'outline'} 
                             className={plan.name === 'Pro' ? 'bg-warning/20 text-warning' : plan.name === 'Business' ? 'bg-primary/20 text-primary' : ''}>
                        {plan.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{plan.users} users</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">KES {plan.revenue.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Plan Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Growth Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Monthly Growth (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subscriptionAnalytics.monthlyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="newUsers" name="New Users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="upgrades" name="Upgrades" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Upgrades */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-success" />
              Recent Subscription Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users
                .filter(u => u.subscription_status === 'active' && u.subscription_plan !== 'free_trial')
                .slice(0, 5)
                .map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{u.business_name || u.email || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{u.phone_number || '-'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-muted-foreground">Trial</Badge>
                      <ArrowUpRight className="h-4 w-4 text-success" />
                      {getPlanBadge(u.subscription_plan)}
                    </div>
                  </div>
                ))}
              {users.filter(u => u.subscription_status === 'active' && u.subscription_plan !== 'free_trial').length === 0 && (
                <p className="text-center text-muted-foreground py-4">No active subscriptions yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by business name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trial/Sub Ends</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userProfile) => (
                      <TableRow key={userProfile.id}>
                        <TableCell className="font-medium">
                          {userProfile.business_name || 'No name'}
                        </TableCell>
                        <TableCell className="text-sm">{userProfile.email || '-'}</TableCell>
                        <TableCell>{userProfile.phone_number || '-'}</TableCell>
                        <TableCell>{getPlanBadge(userProfile.subscription_plan)}</TableCell>
                        <TableCell>
                          {getStatusBadge(userProfile.subscription_status, userProfile.trial_ends_at, userProfile.subscription_plan)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {userProfile.subscription_status === 'trial' && userProfile.trial_ends_at
                            ? format(new Date(userProfile.trial_ends_at), 'MMM d, yyyy')
                            : userProfile.subscription_ends_at
                            ? format(new Date(userProfile.subscription_ends_at), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(userProfile.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => extendTrial(userProfile.id)}
                            >
                              +14 days
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openEditDialog(userProfile)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(userProfile)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="catalog">
            <AdminCatalogManager />
          </TabsContent>

          <TabsContent value="services">
            <AdminServicesManager />
          </TabsContent>

          <TabsContent value="pages">
            <AdminPageContent />
          </TabsContent>

          <TabsContent value="transactions">
            <PaymentTransactions />
          </TabsContent>

          <TabsContent value="pricing">
            <AdminPricingPlans />
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentGateways />
          </TabsContent>

          <TabsContent value="branding">
            <AdminLoginBranding />
          </TabsContent>

          <TabsContent value="settings">
            <AdminAppSettings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-muted-foreground">Business</Label>
              <p className="font-medium">{selectedUser?.business_name || 'No name'}</p>
            </div>
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  <SelectItem value="free_trial">Free Trial</SelectItem>
                  <SelectItem value="starter">Starter (KES 500/mo)</SelectItem>
                  <SelectItem value="business">Business (KES 1,200/mo)</SelectItem>
                  <SelectItem value="pro">Pro (KES 2,000/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubscription}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This will remove their login access but preserve their business data.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm font-medium">{selectedUser?.business_name || 'No name'}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.email || 'No email'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
