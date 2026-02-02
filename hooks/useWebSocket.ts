/**
 * WebSocket Hook
 *
 * Manages WebSocket connection for real-time updates:
 * - SOW generation progress
 * - Step Function status updates
 * - Error notifications
 * - Toast messages
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';
import { classifyEvent } from '@/utils/eventClassification';
import type { WebSocketMessage } from '@/types';

interface UseWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onProgress?: (data: { message: string; progress?: number }) => void;
  onStatus?: (data: { status: string; message?: string }) => void;
  onError?: (data: { error: string }) => void;
  onToast?: (data: { message: string; type?: string }) => void;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    enabled = true,
    onMessage,
    onProgress,
    onStatus,
    onError,
    onToast,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const connect = useCallback(async () => {
    if (!enabled) return;

    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN || state.isConnecting) {
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Get access token for authentication
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_ENDPOINT;
      if (!wsUrl) {
        throw new Error('WebSocket endpoint not configured');
      }

      // Create WebSocket connection with token
      const ws = new WebSocket(`${wsUrl}?token=${token}`);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setState({
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        });
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;

          console.log('[WebSocket] Raw message received:', event.data);
          console.log('[WebSocket] Parsed message:', JSON.stringify(message, null, 2));

          // Classify the event
          const classification = classifyEvent(message);
          console.log('[WebSocket] Classification:', classification);

          // Call appropriate callback based on classification
          const messageData = message.data as Record<string, unknown> | undefined;
          switch (classification) {
            case 'progress':
              onProgress?.({
                message: message.message,
                progress: messageData?.progress as number | undefined,
              });
              break;

            case 'status':
              onStatus?.({
                status: messageData?.status as string,
                message: message.message,
              });
              break;

            case 'error':
              onError?.({
                error: message.message || 'An error occurred',
              });
              break;

            case 'toast':
              onToast?.({
                message: message.message,
                type: messageData?.type as string | undefined,
              });
              break;

            default:
              // Call generic onMessage callback for unknown types
              console.log('[WebSocket] Calling onMessage callback with message');
              onMessage?.(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState((prev) => ({
          ...prev,
          error: 'WebSocket connection error',
        }));
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
        }));

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && enabled) {
          attemptReconnect();
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
      attemptReconnect();
    }
  }, [enabled, onMessage, onProgress, onStatus, onError, onToast, state.isConnecting]);

  const attemptReconnect = useCallback(() => {
    if (
      !enabled ||
      state.reconnectAttempts >= maxReconnectAttempts ||
      reconnectTimeoutRef.current
    ) {
      return;
    }

    console.log(
      `Attempting to reconnect WebSocket (attempt ${state.reconnectAttempts + 1}/${maxReconnectAttempts})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));
      reconnectTimeoutRef.current = null;
      connect();
    }, reconnectDelay);
  }, [enabled, state.reconnectAttempts, maxReconnectAttempts, reconnectDelay, connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
    });
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled]); // Only depend on enabled, not connect/disconnect to avoid reconnect loops

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
  };
}
