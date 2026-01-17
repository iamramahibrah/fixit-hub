import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionsList } from '@/components/transactions/TransactionsList';
import { InvoiceCreator } from '@/components/invoices/InvoiceCreator';
import { InvoicesList } from '@/components/invoices/InvoicesList';
import { VATReport } from '@/components/reports/VATReport';
import { Settings } from '@/components/settings/Settings';
import { DeadlineReminders } from '@/components/reminders/DeadlineReminders';
import { InventoryManagement } from '@/components/inventory/InventoryManagement';
import { PaymentTracking } from '@/components/payments/PaymentTracking';
import { KraFiling } from '@/components/kra/KraFiling';
import { BillingHistory } from '@/components/billing/BillingHistory';
import { EtimsComplianceDashboard } from '@/components/etims';
import { PointOfSale, POSSalesReport } from '@/components/pos';
import { CustomerManagement } from '@/components/customers';
import { CashierManagement } from '@/components/cashier';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'add-sale' | 'add-expense' | 'invoices' | 'invoices-list' | 'reports' | 'settings' | 'transactions-list' | 'inventory' | 'payments' | 'kra-filing' | 'billing' | 'etims' | 'pos' | 'pos-reports' | 'customers' | 'cashiers';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const { 
    transactions, invoices, profile, deadlines, products, summary,
    loading: dataLoading,
    addTransaction, updateTransaction, deleteTransaction,
    addInvoice, updateInvoiceStatus, deleteInvoice,
    updateProfile, addProduct, updateProduct, deleteProduct,
    refetch,
  } = useSupabaseData();

  const {
    notifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  } = useNotifications({ deadlines, invoices, products });

  const handleRefresh = useCallback(async () => {
    await refetch();
    toast.success('Data refreshed');
  }, [refetch]);

  // Enable idle timeout - logs out after 15 minutes of inactivity
  useIdleTimeout(!!user);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleManageSubscription = () => {
    navigate('/pricing');
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'dashboard') setCurrentView('dashboard');
    else if (tab === 'transactions') setCurrentView('transactions-list');
    else if (tab === 'invoices') setCurrentView('invoices-list');
    else if (tab === 'inventory') setCurrentView('inventory');
    else if (tab === 'payments') setCurrentView('payments');
    else if (tab === 'reports') setCurrentView('reports');
    else if (tab === 'kra-filing') setCurrentView('kra-filing');
    else if (tab === 'billing') setCurrentView('billing');
    else if (tab === 'settings') setCurrentView('settings');
    else if (tab === 'pos') setCurrentView('pos');
    else if (tab === 'pos-reports') setCurrentView('pos-reports');
    else if (tab === 'customers') setCurrentView('customers');
    else if (tab === 'cashiers') setCurrentView('cashiers');
    else if (tab === 'admin') navigate('/admin');
  };

  const handleAddSale = () => setCurrentView('add-sale');
  const handleAddExpense = () => setCurrentView('add-expense');
  const handleCreateInvoice = () => setCurrentView('invoices');
  const handleViewVAT = () => setCurrentView('reports');
  const handleViewTransactions = () => {
    setCurrentView('transactions-list');
    setActiveTab('transactions');
  };
  const handleViewEtims = () => {
    setCurrentView('etims');
  };
  const handleOpenPOS = () => {
    setCurrentView('pos');
    setActiveTab('pos');
  };
  const handleBack = () => {
    setCurrentView('dashboard');
    setActiveTab('dashboard');
  };
  const handleBackToInvoices = () => {
    setCurrentView('invoices-list');
    setActiveTab('invoices');
  };

  const handleTransactionSubmit = async (data: {
    amount: number;
    description: string;
    category: string;
    customer?: string;
    vendor?: string;
    isVatApplicable: boolean;
    vatAmount?: number;
    date: Date;
    receiptImage?: string;
    productId?: string;
    quantitySold?: number;
  }) => {
    const type = currentView === 'add-sale' ? 'sale' : 'expense';
    const result = await addTransaction({
      type,
      amount: data.amount,
      description: data.description,
      category: data.category,
      customer: data.customer,
      vendor: data.vendor,
      isVatApplicable: data.isVatApplicable,
      vatAmount: data.vatAmount,
      date: data.date,
      receiptImage: data.receiptImage,
    });
    
    if (result) {
      // Update stock quantity if a product was sold
      if (data.productId && data.quantitySold) {
        const product = products.find(p => p.id === data.productId);
        if (product) {
          await updateProduct(data.productId, {
            quantity: Math.max(0, product.quantity - data.quantitySold)
          });
        }
      }
      handleBack();
    }
  };

  const handleInvoiceSubmit = async (data: Parameters<typeof addInvoice>[0] & { 
    productUpdates?: { productId: string; quantitySold: number }[] 
  }) => {
    const { productUpdates, ...invoiceData } = data;
    const invoice = await addInvoice(invoiceData);
    if (invoice) {
      // Update stock quantities if there are product updates
      if (productUpdates && productUpdates.length > 0) {
        for (const update of productUpdates) {
          const product = products.find(p => p.id === update.productId);
          if (product) {
            await updateProduct(update.productId, {
              quantity: Math.max(0, product.quantity - update.quantitySold)
            });
          }
        }
      }
      toast.success('Invoice created!', {
        description: `${invoice.invoiceNumber} for ${data.customer.name}`,
      });
    }
    handleBackToInvoices();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Deadline Reminders */}
      <DeadlineReminders deadlines={deadlines} />

      {/* Desktop Sidebar */}
      <Sidebar
        profile={profile}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSignOut={handleSignOut}
      />

      {/* Mobile Header */}
      <div className="lg:hidden">
        <Header 
          profile={profile} 
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onDismissNotification={dismissNotification}
          onSignOut={handleSignOut} 
          onManageSubscription={handleManageSubscription}
        />
      </div>
      
      {/* Main Content */}
      <main className="lg:pl-64">
        <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
          <div className="px-3 sm:px-4 py-4 sm:py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto">
            {currentView === 'dashboard' && (
              <Dashboard
                profile={profile}
                transactions={transactions}
                deadlines={deadlines}
                summary={summary}
                onAddSale={handleAddSale}
                onAddExpense={handleAddExpense}
                onCreateInvoice={handleCreateInvoice}
                onViewVAT={handleViewVAT}
                onViewTransactions={handleViewTransactions}
                onViewEtims={handleViewEtims}
              />
            )}

            {currentView === 'etims' && (
              <EtimsComplianceDashboard onBack={handleBack} />
            )}

            {currentView === 'transactions-list' && (
              <TransactionsList
                transactions={transactions}
                onBack={handleBack}
                onUpdate={updateTransaction}
                onDelete={deleteTransaction}
              />
            )}

            {(currentView === 'add-sale' || currentView === 'add-expense') && (
              <TransactionForm
                type={currentView === 'add-sale' ? 'sale' : 'expense'}
                products={currentView === 'add-sale' ? products : []}
                onSubmit={handleTransactionSubmit}
                onBack={handleBack}
              />
            )}

            {currentView === 'invoices' && (
              <InvoiceCreator
                profile={profile}
                products={products}
                onSubmit={handleInvoiceSubmit}
                onBack={handleBackToInvoices}
              />
            )}

            {currentView === 'invoices-list' && (
              <InvoicesList
                invoices={invoices}
                profile={profile}
                onBack={handleBack}
                onUpdateStatus={updateInvoiceStatus}
                onDelete={deleteInvoice}
              />
            )}

            {currentView === 'inventory' && (
              <InventoryManagement
                products={products}
                onBack={handleBack}
                onAdd={addProduct}
                onUpdate={updateProduct}
                onDelete={deleteProduct}
              />
            )}

            {currentView === 'payments' && (
              <PaymentTracking
                invoices={invoices}
                profile={profile}
                onBack={handleBack}
                onUpdateStatus={updateInvoiceStatus}
              />
            )}

            {currentView === 'reports' && (
              <VATReport
                profile={profile}
                transactions={transactions}
                summary={summary}
                onBack={handleBack}
              />
            )}

            {currentView === 'kra-filing' && (
              <KraFiling
                profile={profile}
                transactions={transactions}
                invoices={invoices}
              />
            )}

            {currentView === 'billing' && (
              <BillingHistory onBack={handleBack} />
            )}

            {currentView === 'settings' && (
              <Settings
                profile={profile}
                onUpdateProfile={updateProfile}
                onBack={handleBack}
              />
            )}

            {currentView === 'pos' && (
              <PointOfSale
                products={products}
                profile={profile}
                onBack={handleBack}
                onSaleComplete={async (saleData) => {
                  // Create transaction with M-Pesa reference if available
                  await addTransaction({
                    type: 'sale',
                    amount: saleData.total,
                    description: `POS Sale - ${saleData.items.length} item(s)`,
                    category: 'product',
                    date: new Date(),
                    isVatApplicable: profile.isVatRegistered,
                    vatAmount: saleData.vatAmount,
                    paymentMethod: saleData.paymentMethod,
                    paymentReference: saleData.mpesaReceiptNumber,
                  });
                  // Update stock
                  for (const update of saleData.productUpdates) {
                    const product = products.find(p => p.id === update.productId);
                    if (product) {
                      await updateProduct(update.productId, {
                        quantity: Math.max(0, product.quantity - update.quantitySold)
                      });
                    }
                  }
                }}
              />
            )}

            {currentView === 'pos-reports' && (
              <POSSalesReport
                transactions={transactions}
                onBack={handleBack}
              />
            )}

            {currentView === 'customers' && (
              <CustomerManagement onBack={handleBack} />
            )}

            {currentView === 'cashiers' && (
              <CashierManagement onBack={handleBack} />
            )}
          </div>
        </PullToRefresh>
      </main>

      {/* Mobile Nav */}
      <div className="lg:hidden">
        <MobileNav activeTab={activeTab} onTabChange={handleTabChange} isAdmin={isAdmin} />
      </div>
    </div>
  );
};

export default Index;
