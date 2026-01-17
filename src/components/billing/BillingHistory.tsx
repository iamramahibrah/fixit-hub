import { useEffect, useState } from 'react';
import { ArrowLeft, CreditCard, Check, X, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatKES } from '@/lib/constants';
import { format } from 'date-fns';

interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_reference: string | null;
  transaction_id: string | null;
  subscription_plan: string;
  status: string;
  created_at: string;
}

interface BillingHistoryProps {
  onBack: () => void;
}

export function BillingHistory({ onBack }: BillingHistoryProps) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching transactions:', error);
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20"><Check className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'mpesa':
        return '📱';
      case 'stripe':
        return '💳';
      case 'pesapal':
        return '🏦';
      default:
        return '💰';
    }
  };

  const getPlanBadge = (plan: string) => {
    const planColors: Record<string, string> = {
      starter: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      business: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      pro: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };
    return <Badge className={planColors[plan] || 'bg-muted text-muted-foreground'}>{plan}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Billing History</h1>
          <p className="text-sm text-muted-foreground">
            View your subscription payment history
          </p>
        </div>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No payment history</h3>
          <p className="text-sm text-muted-foreground">
            Your subscription payment transactions will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    {getPaymentMethodIcon(transaction.payment_method)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground capitalize">
                        {transaction.payment_method} Payment
                      </span>
                      {getPlanBadge(transaction.subscription_plan)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{format(new Date(transaction.created_at), 'PPp')}</span>
                      {transaction.payment_reference && (
                        <>
                          <span>•</span>
                          <span>Ref: {transaction.payment_reference}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground">
                    {transaction.currency === 'KES' 
                      ? formatKES(transaction.amount)
                      : `${transaction.currency} ${transaction.amount.toFixed(2)}`
                    }
                  </p>
                  <div className="mt-1">
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
