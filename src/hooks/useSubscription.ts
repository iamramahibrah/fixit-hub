import { useMemo } from 'react';
import { BusinessProfile } from '@/types';

interface SubscriptionStatus {
  isActive: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  canUseAiFeatures: boolean;
  daysRemaining: number | null;
  plan: string;
}

export function useSubscription(profile: BusinessProfile): SubscriptionStatus {
  return useMemo(() => {
    const now = new Date();
    
    // Check trial status
    const trialEndsAt = profile.trialEndsAt ? new Date(profile.trialEndsAt) : null;
    const isTrialActive = trialEndsAt ? trialEndsAt > now : false;
    
    // Check subscription status
    const subscriptionEndsAt = profile.subscriptionEndsAt ? new Date(profile.subscriptionEndsAt) : null;
    const isSubscriptionActive = subscriptionEndsAt ? subscriptionEndsAt > now : false;
    
    // Check if on a paid plan
    const paidPlans = ['starter', 'business', 'pro'];
    const isPremium = paidPlans.includes(profile.subscriptionPlan || '');
    
    // Determine if user has active access
    const isActive = isTrialActive || (isPremium && isSubscriptionActive);
    
    // AI features require active subscription (not just trial for some features)
    const canUseAiFeatures = isActive;
    
    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (isTrialActive && trialEndsAt) {
      daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    } else if (isSubscriptionActive && subscriptionEndsAt) {
      daysRemaining = Math.ceil((subscriptionEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return {
      isActive,
      isPremium,
      isTrialActive,
      canUseAiFeatures,
      daysRemaining,
      plan: profile.subscriptionPlan || 'free_trial'
    };
  }, [profile.trialEndsAt, profile.subscriptionEndsAt, profile.subscriptionPlan]);
}
