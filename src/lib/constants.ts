export const VAT_RATE = 0.16; // 16% VAT in Kenya

export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent', icon: 'Building2' },
  { value: 'stock', label: 'Stock/Inventory', icon: 'Package' },
  { value: 'transport', label: 'Transport', icon: 'Truck' },
  { value: 'utilities', label: 'Utilities', icon: 'Zap' },
  { value: 'salaries', label: 'Salaries', icon: 'Users' },
  { value: 'marketing', label: 'Marketing', icon: 'Megaphone' },
  { value: 'equipment', label: 'Equipment', icon: 'Wrench' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
] as const;

export const SALE_CATEGORIES = [
  { value: 'product', label: 'Product Sale', icon: 'ShoppingBag' },
  { value: 'service', label: 'Service', icon: 'Briefcase' },
] as const;

export const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop (Duka)' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'service', label: 'Service Provider' },
  { value: 'online', label: 'Online/Digital Business' },
] as const;

export const formatKES = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const getDaysUntil = (date: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
