/**
 * useSessionMonitor Hook
 *
 * Monitors user session for inactivity timeout
 * Automatically logs out user after period of inactivity
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import {
  updateLastActivity,
  isSessionTimedOut,
  getSessionTimeoutMs,
} from '@/lib/auth';

interface UseSessionMonitorOptions {
  onSessionTimeout: () => void;
  enabled?: boolean;
}

/**
 * Hook to monitor user session and trigger logout on inactivity
 */
export function useSessionMonitor({
  onSessionTimeout,
  enabled = true,
}: UseSessionMonitorOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isEnabledRef = useRef(enabled);

  // Update ref when enabled changes
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    if (!isEnabledRef.current) return;
    updateLastActivity();
  }, []);

  // Check session status
  const checkSession = useCallback(() => {
    if (!isEnabledRef.current) return;

    if (isSessionTimedOut()) {
      console.log('[SessionMonitor] Session timed out due to inactivity');
      onSessionTimeout();
    }
  }, [onSessionTimeout]);

  useEffect(() => {
    if (!enabled) {
      // Clear any existing timeout when disabled
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Activity events to track
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // Throttle activity updates (max once per 30 seconds)
    let lastUpdate = 0;
    const throttledActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 30000) {
        lastUpdate = now;
        handleActivity();
      }
    };

    // Add activity listeners
    activityEvents.forEach((event) => {
      window.addEventListener(event, throttledActivity, { passive: true });
    });

    // Initial activity update
    handleActivity();

    // Check session status every minute
    const checkIntervalMs = 60000; // 1 minute
    timeoutRef.current = setInterval(checkSession, checkIntervalMs);

    // Also check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, throttledActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, handleActivity, checkSession]);

  return {
    resetActivity: handleActivity,
    checkSession,
    timeoutMs: getSessionTimeoutMs(),
  };
}
