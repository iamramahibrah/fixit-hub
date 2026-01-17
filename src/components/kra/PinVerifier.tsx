import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useKraVerification } from '@/hooks/useKraVerification';
import { cn } from '@/lib/utils';

interface PinVerifierProps {
  onVerified?: (result: { valid: boolean; name?: string; pin?: string }) => void;
  className?: string;
  disabled?: boolean;
}

export function PinVerifier({ onVerified, className, disabled }: PinVerifierProps) {
  const [pin, setPin] = useState('');
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    name?: string;
    checked: boolean;
  } | null>(null);
  
  const { verifyPin, verifyingPin } = useKraVerification();

  const handleVerify = async () => {
    const result = await verifyPin(pin);
    if (result) {
      setVerificationResult({ ...result, checked: true });
      onVerified?.({ ...result, pin });
    }
  };

  const handlePinChange = (value: string) => {
    setPin(value.toUpperCase());
    setVerificationResult(null);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <Label htmlFor="kraPin" className="text-xs flex items-center gap-2">
        <Shield className="w-3 h-3" />
        Customer KRA PIN (Optional)
      </Label>
      <div className="flex gap-2">
        <Input
          id="kraPin"
          value={pin}
          onChange={(e) => handlePinChange(e.target.value)}
          placeholder="e.g., A123456789Z"
          className="flex-1"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleVerify}
          disabled={!pin || pin.length < 10 || verifyingPin || disabled}
        >
          {verifyingPin ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Verify'
          )}
        </Button>
      </div>
      
      {verificationResult?.checked && (
        <div className="flex items-center gap-2">
          {verificationResult.valid ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-success" />
              <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                Verified: {verificationResult.name || 'Valid PIN'}
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-destructive" />
              <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                Invalid PIN
              </Badge>
            </>
          )}
        </div>
      )}
    </div>
  );
}
