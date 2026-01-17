import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const EVENTS_TO_TRACK = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function useIdleTimeout(isEnabled: boolean = true) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const handleIdle = useCallback(async () => {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Store the email for "remember email" feature
      const rememberedEmail = localStorage.getItem('rememberedEmail');
      if (!rememberedEmail) {
        localStorage.setItem('rememberedEmail', session.user.email || '');
      }
      
      // Set a flag that this is an idle timeout (not manual logout)
      sessionStorage.setItem('idleLogout', 'true');
      
      // Sign out but preserve remembered email
      await supabase.auth.signOut();
      navigate('/auth');
    }
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (isEnabled) {
      timeoutRef.current = setTimeout(handleIdle, IDLE_TIMEOUT_MS);
    }
  }, [handleIdle, isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    // Set initial timer
    resetTimer();

    // Add event listeners
    const handleActivity = () => resetTimer();
    
    EVENTS_TO_TRACK.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      EVENTS_TO_TRACK.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isEnabled, resetTimer]);

  return { resetTimer };
}
