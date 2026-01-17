import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PinVerificationResult {
  valid: boolean;
  name?: string;
  status?: string;
  message?: string;
}

interface TccResult {
  valid: boolean;
  expiryDate?: string;
  status?: string;
  certificateNumber?: string;
  message?: string;
}

export function useKraVerification() {
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [checkingTcc, setCheckingTcc] = useState(false);

  const verifyPin = async (pin: string): Promise<PinVerificationResult | null> => {
    if (!pin || pin.length < 10) {
      toast.error('Please enter a valid KRA PIN (at least 10 characters)');
      return null;
    }

    setVerifyingPin(true);
    try {
      const { data, error } = await supabase.functions.invoke('kra-api', {
        body: { action: 'verify_pin', pin }
      });

      if (error) {
        console.error('PIN verification error:', error);
        toast.error(error.message || 'Failed to verify PIN');
        return null;
      }

      if (data?.error) {
        toast.error(data.message || data.error);
        return { valid: false, message: data.message || data.error };
      }

      const result = data?.data;
      if (result?.valid) {
        toast.success(`PIN verified: ${result.name || 'Valid'}`);
        return { valid: true, name: result.name, status: result.status };
      } else {
        toast.warning('PIN could not be verified');
        return { valid: false, message: result?.message || 'Invalid PIN' };
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      toast.error('Failed to verify PIN. Please check your KRA API settings.');
      return null;
    } finally {
      setVerifyingPin(false);
    }
  };

  const checkTcc = async (pin: string): Promise<TccResult | null> => {
    if (!pin || pin.length < 10) {
      toast.error('Please enter a valid KRA PIN');
      return null;
    }

    setCheckingTcc(true);
    try {
      const { data, error } = await supabase.functions.invoke('kra-api', {
        body: { action: 'check_tcc', pin }
      });

      if (error) {
        console.error('TCC check error:', error);
        toast.error(error.message || 'Failed to check TCC status');
        return null;
      }

      if (data?.error) {
        toast.error(data.message || data.error);
        return { valid: false, message: data.message || data.error };
      }

      const result = data?.data;
      if (result?.valid) {
        toast.success(`TCC Valid until ${result.expiryDate || 'N/A'}`);
        return {
          valid: true,
          expiryDate: result.expiryDate,
          status: result.status,
          certificateNumber: result.certificateNumber
        };
      } else {
        toast.warning('No valid TCC found');
        return { valid: false, message: result?.message || 'No valid TCC' };
      }
    } catch (error) {
      console.error('TCC check error:', error);
      toast.error('Failed to check TCC. Please check your KRA API settings.');
      return null;
    } finally {
      setCheckingTcc(false);
    }
  };

  return {
    verifyPin,
    checkTcc,
    verifyingPin,
    checkingTcc
  };
}
