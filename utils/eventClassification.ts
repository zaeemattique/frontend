/**
 * WebSocket Event Classification Utilities
 *
 * Classifies WebSocket events into categories for proper handling:
 * - Progress events: SOW generation lifecycle events
 * - Toast events: File operations, Avoma sync, notifications
 */

import type { WebSocketMessage } from '@/types';

/**
 * Event types that should be handled by the progress indicator
 * These are SOW generation Step Function lifecycle events
 */
const PROGRESS_EVENTS = new Set([
  'SOW Generation Started',
  'SOW Generation Completed',
  'SOW Generation Failed',
  'Architecture Generation Started',
  'Architecture Generation Completed',
  'Architecture Generation Failed',
  'Pricing Calculator Generation Started',
  'Pricing Calculator Generation Completed',
  'Pricing Calculator Generation Failed',
]);

/**
 * Event types that should be handled by the toast notification system
 * These include file operations, Avoma sync, and other general notifications
 */
const TOAST_EVENTS = new Set([
  'File Upload Completed',
  'File Upload Failed',
  'File Delete Completed',
  'File Delete Failed',
  'Avoma Meeting Sync Started',
  'Avoma Meeting Sync Completed',
  'Avoma Meeting Sync Failed',
  // Add other notification events here as they're implemented
]);

/**
 * Determines if an event should be handled by the progress indicator
 * @param event WebSocket event to classify
 * @returns true if event is a progress event
 */
export function isProgressEvent(event: WebSocketMessage): boolean {
  return event.type === 'progress' || PROGRESS_EVENTS.has(event.message);
}

/**
 * Determines if an event should be handled by the toast notification system
 * @param event WebSocket event to classify
 * @returns true if event is a toast event
 */
export function isToastEvent(event: WebSocketMessage): boolean {
  return event.type === 'toast' || TOAST_EVENTS.has(event.message);
}

/**
 * Filters events to only include progress events
 * @param events Array of WebSocket events
 * @returns Array containing only progress events
 */
export function filterProgressEvents(
  events: WebSocketMessage[]
): WebSocketMessage[] {
  return events.filter(isProgressEvent);
}

/**
 * Filters events to only include toast events
 * @param events Array of WebSocket events
 * @returns Array containing only toast events
 */
export function filterToastEvents(
  events: WebSocketMessage[]
): WebSocketMessage[] {
  return events.filter(isToastEvent);
}

/**
 * Event classification types used by the WebSocket hook
 */
export type EventClassification = 'progress' | 'status' | 'error' | 'toast' | 'unknown';

/**
 * Classifies a WebSocket event into a category for routing to the appropriate handler
 * @param event WebSocket event to classify
 * @returns Classification string indicating event type
 */
export function classifyEvent(event: WebSocketMessage): EventClassification {
  // Check explicit type first
  if (event.type === 'error' || event.message?.toLowerCase().includes('failed')) {
    return 'error';
  }

  if (event.type === 'progress' || isProgressEvent(event)) {
    return 'progress';
  }

  if (event.type === 'status') {
    return 'status';
  }

  if (event.type === 'toast' || isToastEvent(event)) {
    return 'toast';
  }

  return 'unknown';
}

/**
 * Get event variant for toast notifications
 * Determines the visual style based on event content
 */
export function getEventVariant(
  event: WebSocketMessage
): 'success' | 'error' | 'info' | 'warning' {
  const message = event.message.toLowerCase();

  if (message.includes('failed') || message.includes('error')) {
    return 'error';
  }

  if (
    message.includes('completed') ||
    message.includes('success') ||
    message.includes('finished')
  ) {
    return 'success';
  }

  if (message.includes('started') || message.includes('processing')) {
    return 'info';
  }

  if (message.includes('warning') || message.includes('retry')) {
    return 'warning';
  }

  return 'info';
}
