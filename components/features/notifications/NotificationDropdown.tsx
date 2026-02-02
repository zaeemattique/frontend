/**
 * Notification Dropdown Component
 *
 * Bell icon with dropdown showing recent notifications
 * Design: Icon | Title + Message + (Time • Deal Link) | Unread indicator
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, UserPlus, Clock, FileText, RefreshCw } from 'lucide-react';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useMarkVisibleNotificationsAsViewedMutation,
} from '@/store/services/api';
import type { Notification, NotificationType } from '@/types';

// Notification type labels for display
const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  'DEAL_ASSIGNED': 'New Deal Assigned',
  'DEAL_REASSIGNED': 'Deal Reassigned',
  'SOW_READY_FOR_REVIEW': 'SOW Ready for Review',
  'DEAL_STATUS_UPDATED': 'Deal Status Updated',
  'SOW_FLAGGED_FOR_REWORK': 'SOW Flagged for Rework',
};

// Icon mapping for notification types
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'DEAL_ASSIGNED':
      return UserPlus;
    case 'DEAL_REASSIGNED':
      return RefreshCw;
    case 'SOW_READY_FOR_REVIEW':
      return FileText;
    case 'DEAL_STATUS_UPDATED':
      return Clock;
    case 'SOW_FLAGGED_FOR_REWORK':
      return FileText;
    default:
      return Bell;
  }
};

// Background color mapping for notification types
const getNotificationBgColor = (type: NotificationType) => {
  switch (type) {
    case 'DEAL_ASSIGNED':
      return 'bg-blue-50';
    case 'DEAL_REASSIGNED':
      return 'bg-purple-50';
    case 'SOW_READY_FOR_REVIEW':
      return 'bg-green-50';
    case 'DEAL_STATUS_UPDATED':
      return 'bg-yellow-50';
    case 'SOW_FLAGGED_FOR_REWORK':
      return 'bg-red-50';
    default:
      return 'bg-gray-50';
  }
};

// Icon color mapping for notification types
const getNotificationIconColor = (type: NotificationType) => {
  switch (type) {
    case 'DEAL_ASSIGNED':
      return 'text-blue-600';
    case 'DEAL_REASSIGNED':
      return 'text-purple-600';
    case 'SOW_READY_FOR_REVIEW':
      return 'text-green-600';
    case 'DEAL_STATUS_UPDATED':
      return 'text-yellow-600';
    case 'SOW_FLAGGED_FOR_REWORK':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

// Format relative time
const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate: (dealId: string, notificationType: NotificationType) => void;
}

function NotificationItem({ notification, onMarkAsRead, onNavigate }: NotificationItemProps) {
  const Icon = getNotificationIcon(notification.type);
  const bgColor = getNotificationBgColor(notification.type);
  const iconColor = getNotificationIconColor(notification.type);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.deal_id) {
      onNavigate(notification.deal_id, notification.type);
    }
  };

  // Use notification.title if available, otherwise fall back to type label
  const displayTitle = notification.title || NOTIFICATION_TYPE_LABELS[notification.type];

  return (
    <div
      onClick={handleClick}
      className="relative flex items-start gap-3 px-4 py-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p className="text-sm font-semibold text-neutral-800">{displayTitle}</p>

        {/* Message */}
        <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">
          {notification.message}
        </p>

        {/* Time and Deal Link */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-neutral-500">{formatRelativeTime(notification.created_at)}</span>
          {notification.deal_name && (
            <>
              <span className="text-xs text-neutral-300">•</span>
              <span className="text-xs font-medium text-violet-950">
                {notification.deal_name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-blue-500 mt-1" />
      )}
    </div>
  );
}

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasMarkedAsViewedRef = useRef(false);

  // Local state for optimistic updates (prevents glitchy refreshes)
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);

  // Fetch notifications only when dropdown opens (no polling while open to prevent glitches)
  const { data: notificationsData, isLoading } = useGetNotificationsQuery(
    { limit: 20 },
    { skip: !isOpen }
  );

  // Poll unread count only when dropdown is closed (for badge updates)
  const { data: unreadData, refetch: refetchUnreadCount } = useGetUnreadCountQuery(undefined, {
    pollingInterval: isOpen ? undefined : 60000, // Only poll when dropdown is closed
  });

  // Mutations
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [markVisibleAsViewed] = useMarkVisibleNotificationsAsViewedMutation();

  // Sync server data to local state when it arrives (only when dropdown first opens)
  useEffect(() => {
    if (notificationsData?.notifications && isOpen) {
      setLocalNotifications(notificationsData.notifications);
      setLocalUnreadCount(notificationsData.unread_count || 0);
    }
  }, [notificationsData, isOpen]);

  // Sync unread count from server when dropdown is closed
  useEffect(() => {
    if (!isOpen && unreadData?.unread_count !== undefined) {
      setLocalUnreadCount(unreadData.unread_count);
    }
  }, [unreadData, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark visible unread notifications as viewed when dropdown opens (only once per open)
  useEffect(() => {
    if (isOpen && localNotifications.length > 0 && !hasMarkedAsViewedRef.current) {
      const unreadNotificationIds = localNotifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      if (unreadNotificationIds.length > 0) {
        hasMarkedAsViewedRef.current = true;

        // Optimistic update - mark all visible as read immediately in UI
        setLocalNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setLocalUnreadCount(0);

        // Sync to server in background
        markVisibleAsViewed(unreadNotificationIds).catch((error) => {
          console.error('Failed to mark notifications as viewed:', error);
        });
      }
    }
  }, [isOpen, localNotifications, markVisibleAsViewed]);

  // Reset the "marked as viewed" flag when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      hasMarkedAsViewedRef.current = false;
      // Refetch unread count when dropdown closes to get accurate badge
      refetchUnreadCount();
    }
  }, [isOpen, refetchUnreadCount]);

  // Handle opening dropdown - refetch fresh data
  const handleToggleDropdown = useCallback(() => {
    if (!isOpen) {
      // Opening dropdown - will trigger fresh fetch
      hasMarkedAsViewedRef.current = false;
    }
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Optimistic update: mark single notification as read locally, then sync to server
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update - immediately update local state
    setLocalNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setLocalUnreadCount(prev => Math.max(0, prev - 1));

    // Sync to server (don't await, let it happen in background)
    markAsRead(notificationId).catch((error) => {
      console.error('Failed to mark notification as read:', error);
      // Could revert optimistic update here if needed
    });
  }, [markAsRead]);

  // Optimistic update: mark all as read locally, then sync to server
  const handleMarkAllAsRead = useCallback(async () => {
    // Optimistic update - immediately update local state
    setLocalNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setLocalUnreadCount(0);

    // Sync to server
    markAllAsRead().catch((error) => {
      console.error('Failed to mark all notifications as read:', error);
    });
  }, [markAllAsRead]);

  const handleNavigate = (dealId: string, notificationType: NotificationType) => {
    setIsOpen(false);
    // Navigate to artifacts tab for review-related notifications
    if (notificationType === 'SOW_READY_FOR_REVIEW' || notificationType === 'SOW_FLAGGED_FOR_REWORK') {
      router.push(`/deals/${dealId}?tab=artifacts`);
    } else {
      router.push(`/deals/${dealId}`);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggleDropdown}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {localUnreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-blue-600 rounded-full">
            {localUnreadCount > 99 ? '99+' : localUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
            {localUnreadCount > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                {localUnreadCount} new
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              </div>
            ) : localNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Bell className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              localNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {localNotifications.length > 0 && (
            <div className="border-t border-gray-200">
              <div className="flex">
                {localUnreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors border-r border-gray-200"
                  >
                    Mark all as read
                  </button>
                )}
                <button
                  onClick={handleViewAll}
                  className={`${localUnreadCount > 0 ? 'flex-1' : 'w-full'} px-4 py-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-gray-50 transition-colors`}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
