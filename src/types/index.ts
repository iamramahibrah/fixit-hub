export interface BusinessProfile {
  businessName: string;
  kraPin: string;
  isVatRegistered: boolean;
  businessType: 'retail' | 'service' | 'wholesale' | 'online';
  mpesaPaybill?: string;
  mpesaTillNumber?: string;
  phone: string;
  email: string;
  address?: string;
  logoUrl?: string;
  subscriptionPlan?: 'free_trial' | 'starter' | 'business' | 'pro';
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'cancelled';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  // Payment API keys (Admin-only: Stripe and M-Pesa Daraja)
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  mpesaConsumerKey?: string;
  mpesaConsumerSecret?: string;
  mpesaShortcode?: string;
  mpesaPasskey?: string;
  // KRA API keys (placeholder for future integration)
  kraApiKey?: string;
  kraApiSecret?: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: Date;
  customer?: string;
  vendor?: string;
  receiptImage?: string;
  vatAmount?: number;
  isVatApplicable: boolean;
  paymentMethod?: 'cash' | 'mpesa' | 'card' | 'bank';
  paymentReference?: string; // M-Pesa receipt number or other payment reference
}

export type EtimsStatus = 'pending' | 'submitted' | 'verified' | 'failed' | 'cancelled' | null;

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    kraPin?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  paymentMethod: 'cash' | 'mpesa';
  dueDate: Date;
  createdAt: Date;
  // eTIMS fields
  etimsStatus?: EtimsStatus;
  etimsControlNumber?: string | null;
  etimsQrCode?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unitPrice: number;
  costPrice?: number;
  quantity: number;
  minimumStock?: number;
  category?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyCustomer {
  id: string;
  phone: string;
  name?: string;
  pointsBalance: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  type: 'earn' | 'redeem';
  points: number;
  saleAmount?: number;
  description?: string;
  createdAt: Date;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface VATReport {
  period: {
    start: Date;
    end: Date;
  };
  outputVat: number;
  inputVat: number;
  vatPayable: number;
  totalSales: number;
  totalPurchases: number;
  status: 'pending' | 'filed';
}

export interface Deadline {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  type: 'vat' | 'income-tax' | 'custom';
  penalty?: number;
  isCompleted: boolean;
}

export type ExpenseCategory = 
  | 'rent'
  | 'stock'
  | 'transport'
  | 'utilities'
  | 'salaries'
  | 'marketing'
  | 'equipment'
  | 'other';

export type SaleCategory = 
  | 'product'
  | 'service';
