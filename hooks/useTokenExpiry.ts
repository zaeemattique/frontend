/**
 * useTokenExpiry Hook
 *
 * Handles Cognito token expiry automatically using Amplify Hub events.
 * Amplify automatically refreshes tokens, but if the refresh token expires
 * or the user's session is revoked, this hook will trigger a logout.
 *
 * Token lifetimes (configurable in Cognito User Pool):
 * - Access Token: 1 hour (default)
 * - ID Token: 1 hour (default)
 * - Refresh Token: 30 days (default)
 *
 * Amplify automatically refreshes access/ID tokens using the refresh token.
 * This hook handles cases where refresh fails (expired refresh token, revoked session).
 */

'use client';

import { useEffect, useCallback } from 'react';
import { Hub } from 'aws-amplify/utils';
import { fetchAuthSession } from 'aws-amplify/auth';

interface UseTokenExpiryOptions {
  onSessionExpired: () => void;
  enabled?: boolean;
}

/**
 * Hook to monitor Cognito token expiry via Amplify Hub events
 */
export function useTokenExpiry({
  onSessionExpired,
  enabled = true,
}: UseTokenExpiryOptions) {
  // Check if session is still valid
  const checkSession = useCallback(async (): Promise<boolean> => {
    try {
      const session = await fetchAuthSession();
      // If no tokens, session has expired
      if (!session.tokens?.accessToken) {
        console.log('[TokenExpiry] No valid tokens found');
        return false;
      }
      return true;
    } catch (error) {
      console.error('[TokenExpiry] Session check failed:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Listen to Amplify Auth Hub events
    const hubListener = Hub.listen('auth', async ({ payload }) => {
      console.log('[TokenExpiry] Auth event:', payload.event);

      switch (payload.event) {
        case 'tokenRefresh':
          // Token was successfully refreshed - no action needed
          console.log('[TokenExpiry] Token refreshed successfully');
          break;

        case 'tokenRefresh_failure':
          // Token refresh failed - likely expired refresh token
          console.log('[TokenExpiry] Token refresh failed - session expired');
          onSessionExpired();
          break;

        case 'signedOut':
          // User signed out (could be from another tab)
          console.log('[TokenExpiry] User signed out');
          onSessionExpired();
          break;

        case 'signInWithRedirect_failure':
          // OAuth sign-in failed
          console.log('[TokenExpiry] Sign in redirect failed');
          break;
      }
    });

    // Also check session on visibility change (when user returns to tab)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const isValid = await checkSession();
        if (!isValid) {
          console.log('[TokenExpiry] Session invalid on tab focus');
          onSessionExpired();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      hubListener();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, onSessionExpired, checkSession]);

  return {
    checkSession,
  };
}
