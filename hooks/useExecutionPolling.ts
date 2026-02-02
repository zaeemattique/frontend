/**
 * useExecutionPolling Hook
 *
 * A reusable hook for polling AWS Step Function execution status.
 * Used by components that trigger async Step Functions and need to track completion.
 *
 * Features:
 * - Polls execution status every 3 seconds when active
 * - Handles SUCCEEDED, FAILED, TIMED_OUT, and ABORTED states
 * - Prevents duplicate completion handling
 * - Can be used alongside WebSocket for redundant completion detection
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useGetExecutionStatusQuery } from '@/store/services/api';

interface UseExecutionPollingOptions {
  /** Called when execution succeeds */
  onSuccess?: () => void;
  /** Called when execution fails with error message */
  onError?: (error: string) => void;
  /** Polling interval in milliseconds (default: 3000) */
  pollingInterval?: number;
}

interface UseExecutionPollingReturn {
  /** Start polling for the given execution ARN */
  startPolling: (arn: string) => void;
  /** Stop polling and reset state */
  stopPolling: () => void;
  /** Mark completion as handled (call this if WebSocket completes first) */
  markHandled: () => void;
  /** Check if completion has been handled */
  isHandled: () => boolean;
  /** Reset the handled flag (call when starting a new execution) */
  resetHandled: () => void;
  /** Current execution ARN being polled (null if not polling) */
  executionArn: string | null;
  /** Whether polling is active */
  isPolling: boolean;
}

export function useExecutionPolling(
  options: UseExecutionPollingOptions = {}
): UseExecutionPollingReturn {
  const { onSuccess, onError, pollingInterval = 3000 } = options;

  const [executionArn, setExecutionArn] = useState<string | null>(null);
  const completionHandledRef = useRef(false);

  // Poll execution status when we have an executionArn
  const { data: executionStatus } = useGetExecutionStatusQuery(executionArn || '', {
    skip: !executionArn,
    pollingInterval: executionArn ? pollingInterval : 0,
  });

  // Handle execution status updates from polling
  useEffect(() => {
    if (!executionStatus) return;
    if (!executionArn) return;

    const status = executionStatus.status;

    if (status === 'SUCCEEDED' && !completionHandledRef.current) {
      completionHandledRef.current = true;
      setExecutionArn(null);
      onSuccess?.();
    } else if (
      (status === 'FAILED' || status === 'TIMED_OUT' || status === 'ABORTED') &&
      !completionHandledRef.current
    ) {
      completionHandledRef.current = true;
      setExecutionArn(null);
      const errorMessage = executionStatus.error?.cause || `Execution ${status.toLowerCase()}`;
      onError?.(errorMessage);
    }
  }, [executionStatus, executionArn, onSuccess, onError]);

  const startPolling = useCallback((arn: string) => {
    setExecutionArn(arn);
  }, []);

  const stopPolling = useCallback(() => {
    setExecutionArn(null);
  }, []);

  const markHandled = useCallback(() => {
    completionHandledRef.current = true;
    setExecutionArn(null);
  }, []);

  const isHandled = useCallback(() => {
    return completionHandledRef.current;
  }, []);

  const resetHandled = useCallback(() => {
    completionHandledRef.current = false;
  }, []);

  return {
    startPolling,
    stopPolling,
    markHandled,
    isHandled,
    resetHandled,
    executionArn,
    isPolling: !!executionArn,
  };
}
