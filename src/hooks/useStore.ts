import { useState, useEffect } from 'react';
import { Transaction, Invoice, BusinessProfile, Deadline } from '@/types';

// Mock data for demo
const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'sale',
    amount: 15000,
    description: 'Groceries sold to customer',
    category: 'product',
    date: new Date(),
    customer: 'John Mwangi',
    isVatApplicable: true,
    vatAmount: 2400,
  },
  {
    id: '2',
    type: 'sale',
    amount: 8500,
    description: 'Phone accessories',
    category: 'product',
    date: new Date(Date.now() - 86400000),
    isVatApplicable: true,
    vatAmount: 1360,
  },
  {
    id: '3',
    type: 'expense',
    amount: 5000,
    description: 'Transport to supplier',
    category: 'transport',
    date: new Date(Date.now() - 86400000 * 2),
    vendor: 'Uber Kenya',
    isVatApplicable: false,
  },
  {
    id: '4',
    type: 'expense',
    amount: 25000,
    description: 'Monthly rent',
    category: 'rent',
    date: new Date(Date.now() - 86400000 * 5),
    vendor: 'Landlord',
    isVatApplicable: false,
  },
  {
    id: '5',
    type: 'sale',
    amount: 12000,
    description: 'Consulting service',
    category: 'service',
    date: new Date(Date.now() - 86400000 * 3),
    customer: 'ABC Company',
    isVatApplicable: true,
    vatAmount: 1920,
  },
];

const mockDeadlines: Deadline[] = [
  {
    id: '1',
    title: 'VAT Return Filing',
    description: 'Monthly VAT 3 return due',
    dueDate: new Date(2025, 0, 20), // January 20, 2025
    type: 'vat',
    penalty: 10000,
    isCompleted: false,
  },
  {
    id: '2',
    title: 'Income Tax Installment',
    description: 'Q4 income tax payment',
    dueDate: new Date(2025, 3, 20), // April 20, 2025
    type: 'income-tax',
    penalty: 20000,
    isCompleted: false,
  },
];

const mockProfile: BusinessProfile = {
  businessName: 'Mama Njeri Stores',
  kraPin: 'A123456789K',
  isVatRegistered: true,
  businessType: 'retail',
  mpesaPaybill: '123456',
  mpesaTillNumber: '987654',
  phone: '+254712345678',
  email: 'mamanjeri@example.com',
  address: 'Kenyatta Avenue, Nairobi',
};

export function useStore() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>(mockProfile);
  const [deadlines, setDeadlines] = useState<Deadline[]>(mockDeadlines);

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
  };

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>) => {
    const invoiceCount = invoices.length + 1;
    const newInvoice: Invoice = {
      ...invoice,
      id: Date.now().toString(),
      invoiceNumber: `INV-${String(invoiceCount).padStart(3, '0')}`,
      createdAt: new Date(),
    };
    setInvoices(prev => [newInvoice, ...prev]);
    
    // Auto-add as sale
    addTransaction({
      type: 'sale',
      amount: invoice.total,
      description: `Invoice ${newInvoice.invoiceNumber} - ${invoice.customer.name}`,
      category: 'product',
      date: new Date(),
      customer: invoice.customer.name,
      isVatApplicable: true,
      vatAmount: invoice.vatAmount,
    });
    
    return newInvoice;
  };

  const updateProfile = (updates: Partial<BusinessProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  // Calculate summaries
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySales = transactions
    .filter(t => t.type === 'sale' && new Date(t.date).toDateString() === today.toDateString())
    .reduce((sum, t) => sum + t.amount, 0);

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  
  const monthlySales = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'sale' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = transactions
    .filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyProfit = monthlySales - monthlyExpenses;

  const outputVat = transactions
    .filter(t => t.type === 'sale' && t.isVatApplicable)
    .reduce((sum, t) => sum + (t.vatAmount || 0), 0);

  const inputVat = transactions
    .filter(t => t.type === 'expense' && t.isVatApplicable)
    .reduce((sum, t) => sum + (t.vatAmount || 0), 0);

  return {
    transactions,
    invoices,
    profile,
    deadlines,
    addTransaction,
    addInvoice,
    updateProfile,
    summary: {
      todaySales,
      monthlySales,
      monthlyExpenses,
      monthlyProfit,
      outputVat,
      inputVat,
      vatPayable: outputVat - inputVat,
    },
  };
}
