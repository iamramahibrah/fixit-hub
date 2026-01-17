import { useState } from 'react';
import { Send, Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type EtimsStatus = 'pending' | 'submitted' | 'verified' | 'failed' | 'cancelled' | null;

interface EtimsSubmitButtonProps {
  invoiceId: string;
  currentStatus: EtimsStatus;
  onSubmitSuccess?: (result: {
    controlNumber: string;
    qrCode?: string;
  }) => void;
  onStatusChange?: (status: EtimsStatus) => void;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function EtimsSubmitButton({
  invoiceId,
  currentStatus,
  onSubmitSuccess,
  onStatusChange,
  disabled,
  size = 'default',
}: EtimsSubmitButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('etims-submit', {
        body: {
          action: 'submit_invoice',
          invoiceId,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Invoice submitted to KRA eTIMS', {
          description: `Control Unit: ${data.controlUnitNumber}`,
        });
        onSubmitSuccess?.({
          controlNumber: data.controlUnitNumber,
          qrCode: data.qrCodeUrl,
        });
        onStatusChange?.('submitted');
      } else {
        toast.error('eTIMS submission failed', {
          description: data.error || 'Please try again',
        });
        onStatusChange?.('failed');
      }
    } catch (error: any) {
      console.error('eTIMS submit error:', error);
      toast.error('Failed to submit to eTIMS', {
        description: error.message || 'Please check your KRA credentials',
      });
      onStatusChange?.('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    await handleSubmit();
  };

  // Already verified - show success state
  if (currentStatus === 'verified') {
    return (
      <Button variant="success" size={size} disabled className="gap-2">
        <CheckCircle className="h-4 w-4" />
        eTIMS Verified
      </Button>
    );
  }

  // Already submitted - show submitted state
  if (currentStatus === 'submitted') {
    return (
      <Button variant="outline" size={size} disabled className="gap-2 text-primary">
        <CheckCircle className="h-4 w-4" />
        Submitted to eTIMS
      </Button>
    );
  }

  // Failed - show retry option
  if (currentStatus === 'failed') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            size={size} 
            disabled={disabled || isSubmitting}
            className="gap-2 text-warning border-warning/30 hover:bg-warning/10"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Retry eTIMS
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Retry eTIMS Submission
            </AlertDialogTitle>
            <AlertDialogDescription>
              The previous submission failed. Would you like to retry submitting this invoice to KRA eTIMS?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetry}>
              Retry Submission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Not submitted yet - show submit button
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size={size} 
          disabled={disabled || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit to eTIMS
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit to KRA eTIMS</AlertDialogTitle>
          <AlertDialogDescription>
            This will submit the invoice to KRA's Electronic Tax Invoice Management System. 
            Once submitted, you'll receive a Control Unit number for compliance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>
            Submit to KRA
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
