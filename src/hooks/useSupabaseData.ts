import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, Invoice, Deadline, BusinessProfile, Product } from '@/types';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function useSupabaseData() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>({
    businessName: 'My Business',
    kraPin: '',
    isVatRegistered: false,
    businessType: 'retail',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);

  // Fetch all data when user is available
  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      setTransactions(
        (transactionsData || []).map((t) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          description: t.description,
          category: t.category,
          date: new Date(t.date),
          customer: t.customer || undefined,
          vendor: t.vendor || undefined,
          receiptImage: t.receipt_image || undefined,
          vatAmount: t.vat_amount ? Number(t.vat_amount) : undefined,
          isVatApplicable: t.is_vat_applicable,
          paymentMethod: (t as any).payment_method || undefined,
          paymentReference: (t as any).payment_reference || undefined,
        }))
      );

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      setInvoices(
        (invoicesData || []).map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoice_number,
          customer: {
            name: inv.customer_name,
            phone: inv.customer_phone || undefined,
            email: inv.customer_email || undefined,
            kraPin: (inv as any).customer_kra_pin || undefined,
          },
          items: (inv.items as unknown as InvoiceItem[]) || [],
          subtotal: Number(inv.subtotal),
          vatAmount: Number(inv.vat_amount),
          total: Number(inv.total),
          status: inv.status,
          paymentMethod: (inv as any).payment_method || 'cash',
          dueDate: new Date(inv.due_date),
          createdAt: new Date(inv.created_at),
          // eTIMS fields
          etimsStatus: (inv as any).etims_status || null,
          etimsControlNumber: (inv as any).etims_control_number || null,
          etimsQrCode: (inv as any).etims_qr_code || null,
        }))
      );

      // Fetch deadlines
      const { data: deadlinesData, error: deadlinesError } = await supabase
        .from('deadlines')
        .select('*')
        .order('due_date', { ascending: true });

      if (deadlinesError) throw deadlinesError;

      setDeadlines(
        (deadlinesData || []).map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description || '',
          dueDate: new Date(d.due_date),
          type: d.type,
          penalty: d.penalty ? Number(d.penalty) : undefined,
          isCompleted: d.is_completed,
        }))
      );

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (!productsError && productsData) {
        setProducts(
          productsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description || undefined,
            sku: p.sku || undefined,
            unitPrice: Number(p.unit_price),
            costPrice: p.cost_price ? Number(p.cost_price) : undefined,
            quantity: p.quantity,
            minimumStock: p.minimum_stock || undefined,
            category: p.category || undefined,
            imageUrl: p.image_url || undefined,
            createdAt: new Date(p.created_at),
            updatedAt: new Date(p.updated_at),
          }))
        );
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          businessName: profileData.business_name || 'My Business',
          kraPin: profileData.kra_pin || '',
          isVatRegistered: profileData.is_vat_registered || false,
          businessType: (profileData.business_type as BusinessProfile['businessType']) || 'retail',
          mpesaPaybill: profileData.mpesa_paybill || undefined,
          mpesaTillNumber: profileData.mpesa_till_number || undefined,
          phone: profileData.phone_number || '',
          email: user.email || '',
          logoUrl: (profileData as any).logo_url || undefined,
          subscriptionPlan: (profileData.subscription_plan as BusinessProfile['subscriptionPlan']) || 'free_trial',
          subscriptionStatus: (profileData.subscription_status as BusinessProfile['subscriptionStatus']) || 'trial',
          trialEndsAt: profileData.trial_ends_at || undefined,
          subscriptionEndsAt: profileData.subscription_ends_at || undefined,
          // Payment API keys
          stripePublishableKey: profileData.stripe_publishable_key || undefined,
          stripeSecretKey: profileData.stripe_secret_key || undefined,
          mpesaConsumerKey: profileData.mpesa_consumer_key || undefined,
          mpesaConsumerSecret: profileData.mpesa_consumer_secret || undefined,
          mpesaShortcode: profileData.mpesa_shortcode || undefined,
          mpesaPasskey: profileData.mpesa_passkey || undefined,
          // KRA API keys
          kraApiKey: (profileData as any).kra_api_key || undefined,
          kraApiSecret: (profileData as any).kra_api_secret || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add transaction
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) {
      toast.error('Please sign in to add transactions');
      return;
    }

    try {
      const insertData = {
        user_id: user.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date.toISOString(),
        customer: transaction.customer || null,
        vendor: transaction.vendor || null,
        receipt_image: transaction.receiptImage || null,
        vat_amount: transaction.vatAmount || null,
        is_vat_applicable: transaction.isVatApplicable,
        payment_method: transaction.paymentMethod || 'cash',
        payment_reference: transaction.paymentReference || null,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const newTransaction: Transaction = {
        id: data.id,
        type: data.type,
        amount: Number(data.amount),
        description: data.description,
        category: data.category,
        date: new Date(data.date),
        customer: data.customer || undefined,
        vendor: data.vendor || undefined,
        receiptImage: data.receipt_image || undefined,
        vatAmount: data.vat_amount ? Number(data.vat_amount) : undefined,
        isVatApplicable: data.is_vat_applicable,
        paymentMethod: (data as any).payment_method || undefined,
        paymentReference: (data as any).payment_reference || undefined,
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      toast.success(`${transaction.type === 'sale' ? 'Sale' : 'Expense'} recorded!`);
      return newTransaction;
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      toast.error(error?.message || 'Failed to add transaction');
      return undefined;
    }
  };

  // Add invoice
  const addInvoice = async (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) => {
    if (!user) return;

    try {
      // Get next invoice number
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true });

      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          user_id: user.id,
          invoice_number: invoiceNumber,
          customer_name: invoice.customer.name,
          customer_phone: invoice.customer.phone || null,
          customer_email: invoice.customer.email || null,
          items: invoice.items as unknown as Json,
          subtotal: invoice.subtotal,
          vat_amount: invoice.vatAmount,
          total: invoice.total,
          status: invoice.status,
          payment_method: invoice.paymentMethod,
          due_date: invoice.dueDate.toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      const newInvoice: Invoice = {
        id: data.id,
        invoiceNumber: data.invoice_number,
        customer: {
          name: data.customer_name,
          phone: data.customer_phone || undefined,
          email: data.customer_email || undefined,
        },
        items: (data.items as unknown as InvoiceItem[]) || [],
        subtotal: Number(data.subtotal),
        vatAmount: Number(data.vat_amount),
        total: Number(data.total),
        status: data.status,
        paymentMethod: (data as any).payment_method || 'cash',
        dueDate: new Date(data.due_date),
        createdAt: new Date(data.created_at),
        // eTIMS fields - new invoices start as null
        etimsStatus: null,
        etimsControlNumber: null,
        etimsQrCode: null,
      };

      setInvoices((prev) => [newInvoice, ...prev]);

      // Auto-add as sale transaction
      await addTransaction({
        type: 'sale',
        amount: invoice.total,
        description: `Invoice ${invoiceNumber} - ${invoice.customer.name}`,
        category: 'product',
        date: new Date(),
        customer: invoice.customer.name,
        isVatApplicable: true,
        vatAmount: invoice.vatAmount,
      });

      return newInvoice;
    } catch (error) {
      console.error('Error adding invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          amount: updates.amount,
          description: updates.description,
          category: updates.category,
          vat_amount: updates.vatAmount,
          is_vat_applicable: updates.isVatApplicable,
          customer: updates.customer,
          vendor: updates.vendor,
        })
        .eq('id', id);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) throw error;

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success('Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<BusinessProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: updates.businessName,
          kra_pin: updates.kraPin,
          is_vat_registered: updates.isVatRegistered,
          business_type: updates.businessType,
          mpesa_paybill: updates.mpesaPaybill,
          mpesa_till_number: updates.mpesaTillNumber,
          phone_number: updates.phone,
          logo_url: updates.logoUrl,
          // Payment API keys
          stripe_publishable_key: updates.stripePublishableKey,
          stripe_secret_key: updates.stripeSecretKey,
          mpesa_consumer_key: updates.mpesaConsumerKey,
          mpesa_consumer_secret: updates.mpesaConsumerSecret,
          mpesa_shortcode: updates.mpesaShortcode,
          mpesa_passkey: updates.mpesaPasskey,
          // KRA API keys
          kra_api_key: updates.kraApiKey,
          kra_api_secret: updates.kraApiSecret,
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      setProfile((prev) => ({ ...prev, ...updates }));
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  // Add deadline
  const addDeadline = async (deadline: Omit<Deadline, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('deadlines')
        .insert({
          user_id: user.id,
          title: deadline.title,
          description: deadline.description,
          due_date: deadline.dueDate.toISOString(),
          type: deadline.type,
          penalty: deadline.penalty || null,
          is_completed: deadline.isCompleted,
        })
        .select()
        .single();

      if (error) throw error;

      const newDeadline: Deadline = {
        id: data.id,
        title: data.title,
        description: data.description || '',
        dueDate: new Date(data.due_date),
        type: data.type,
        penalty: data.penalty ? Number(data.penalty) : undefined,
        isCompleted: data.is_completed,
      };

      setDeadlines((prev) => [...prev, newDeadline].sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ));
      return newDeadline;
    } catch (error) {
      console.error('Error adding deadline:', error);
      toast.error('Failed to add deadline');
    }
  };

  // Toggle deadline completion
  const toggleDeadlineComplete = async (id: string) => {
    if (!user) return;

    const deadline = deadlines.find((d) => d.id === id);
    if (!deadline) return;

    try {
      const { error } = await supabase
        .from('deadlines')
        .update({ is_completed: !deadline.isCompleted })
        .eq('id', id);

      if (error) throw error;

      setDeadlines((prev) =>
        prev.map((d) => (d.id === id ? { ...d, isCompleted: !d.isCompleted } : d))
      );
      toast.success(deadline.isCompleted ? 'Deadline marked as pending' : 'Deadline marked as complete');
    } catch (error) {
      console.error('Error updating deadline:', error);
      toast.error('Failed to update deadline');
    }
  };

  // Update invoice status
  const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
      );
      toast.success(`Invoice marked as ${status}`);
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    }
  };

  // Delete invoice
  const deleteInvoice = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);

      if (error) throw error;

      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      toast.success('Invoice deleted successfully');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  // Calculate summaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaySales = transactions
    .filter((t) => t.type === 'sale' && new Date(t.date).toDateString() === today.toDateString())
    .reduce((sum, t) => sum + t.amount, 0);

  const todayExpenses = transactions
    .filter((t) => t.type === 'expense' && new Date(t.date).toDateString() === today.toDateString())
    .reduce((sum, t) => sum + t.amount, 0);

  const todayBalance = todaySales - todayExpenses;

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();

  const monthlySales = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === 'sale' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyProfit = monthlySales - monthlyExpenses;

  // Add product
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('products').insert({
        user_id: user.id, name: product.name, description: product.description || null,
        sku: product.sku || null, unit_price: product.unitPrice, cost_price: product.costPrice || null,
        quantity: product.quantity, minimum_stock: product.minimumStock || null, category: product.category || null,
        image_url: product.imageUrl || null,
      }).select().single();
      if (error) throw error;
      const newProduct: Product = { id: data.id, name: data.name, description: data.description || undefined,
        sku: data.sku || undefined, unitPrice: Number(data.unit_price), costPrice: data.cost_price ? Number(data.cost_price) : undefined,
        quantity: data.quantity, minimumStock: data.minimum_stock || undefined, category: data.category || undefined,
        imageUrl: (data as any).image_url || undefined,
        createdAt: new Date(data.created_at), updatedAt: new Date(data.updated_at) };
      setProducts((prev) => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Product added!');
    } catch (error) { console.error('Error adding product:', error); toast.error('Failed to add product'); }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('products').update({
        name: updates.name, description: updates.description, sku: updates.sku,
        unit_price: updates.unitPrice, cost_price: updates.costPrice,
        quantity: updates.quantity, minimum_stock: updates.minimumStock, category: updates.category,
        image_url: updates.imageUrl,
      }).eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
      toast.success('Product updated!');
    } catch (error) { console.error('Error updating product:', error); toast.error('Failed to update product'); }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted!');
    } catch (error) { console.error('Error deleting product:', error); toast.error('Failed to delete product'); }
  };

  const outputVat = transactions.filter((t) => t.type === 'sale' && t.isVatApplicable).reduce((sum, t) => sum + (t.vatAmount || 0), 0);
  const inputVat = transactions.filter((t) => t.type === 'expense' && t.isVatApplicable).reduce((sum, t) => sum + (t.vatAmount || 0), 0);

  return {
    transactions, invoices, profile, deadlines, products, loading,
    addTransaction, updateTransaction, deleteTransaction,
    addInvoice, updateInvoiceStatus, deleteInvoice,
    updateProfile, addDeadline, toggleDeadlineComplete,
    addProduct, updateProduct, deleteProduct,
    refetch: fetchData,
    summary: { todaySales, todayExpenses, todayBalance, monthlySales, monthlyExpenses, monthlyProfit, outputVat, inputVat, vatPayable: outputVat - inputVat },
  };
}
