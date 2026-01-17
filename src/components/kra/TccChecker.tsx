import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, FileCheck, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKraVerification } from '@/hooks/useKraVerification';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TccCheckerProps {
  defaultPin?: string;
  onResult?: (result: { valid: boolean; expiryDate?: string }) => void;
  className?: string;
  disabled?: boolean;
}

export function TccChecker({ defaultPin, onResult, className, disabled }: TccCheckerProps) {
  const [pin, setPin] = useState(defaultPin || '');
  const [tccResult, setTccResult] = useState<{
    valid: boolean;
    expiryDate?: string;
    certificateNumber?: string;
    status?: string;
    checked: boolean;
  } | null>(null);
  
  const { checkTcc, checkingTcc } = useKraVerification();

  const handleCheck = async () => {
    const result = await checkTcc(pin);
    if (result) {
      setTccResult({ ...result, checked: true });
      onResult?.(result);
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value.toUpperCase());
    setTccResult(null);
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Tax Compliance Certificate (TCC)</h3>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="tccPin" className="text-xs">KRA PIN to Check</Label>
          <div className="flex gap-2">
            <Input
              id="tccPin"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="Enter KRA PIN"
              className="flex-1"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="default"
              onClick={handleCheck}
              disabled={!pin || pin.length < 10 || checkingTcc || disabled}
            >
              {checkingTcc ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Checking...
                </>
              ) : (
                'Check TCC'
              )}
            </Button>
          </div>
        </div>
        
        {tccResult?.checked && (
          <div className={cn(
            'p-3 rounded-lg border',
            tccResult.valid 
              ? 'bg-success/10 border-success/30' 
              : 'bg-destructive/10 border-destructive/30'
          )}>
            <div className="flex items-start gap-3">
              {tccResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <p className={cn(
                  'font-medium',
                  tccResult.valid ? 'text-success' : 'text-destructive'
                )}>
                  {tccResult.valid ? 'Valid Tax Compliance Certificate' : 'No Valid TCC Found'}
                </p>
                
                {tccResult.valid && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {tccResult.certificateNumber && (
                      <p>Certificate No: <span className="font-medium text-foreground">{tccResult.certificateNumber}</span></p>
                    )}
                    {tccResult.expiryDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Expires: </span>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(tccResult.expiryDate), 'dd MMM yyyy')}
                        </Badge>
                      </div>
                    )}
                    {tccResult.status && (
                      <p>Status: <Badge variant="secondary" className="text-xs">{tccResult.status}</Badge></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
