import { ReactNode } from 'react';
import { Lock, Crown, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGateProps {
  isActive: boolean;
  feature: string;
  children: ReactNode;
  showUpgradePrompt?: boolean;
}

export function SubscriptionGate({ 
  isActive, 
  feature, 
  children, 
  showUpgradePrompt = true 
}: SubscriptionGateProps) {
  const navigate = useNavigate();

  if (isActive) {
    return <>{children}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <Card className="p-6 border-dashed border-2 border-muted-foreground/20">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Crown className="w-4 h-4 text-warning" />
            <Badge variant="secondary">Premium Feature</Badge>
          </div>
          <h3 className="font-semibold text-foreground">{feature}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Upgrade your subscription to access {feature.toLowerCase()} and other premium features.
          </p>
        </div>
        
        <Button onClick={() => navigate('/pricing')} className="gap-2">
          View Plans
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
