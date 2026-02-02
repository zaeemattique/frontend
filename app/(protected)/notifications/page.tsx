/**
 * Notifications Page
 *
 * Displays notifications grouped by time periods (Today, Yesterday, This Week, Earlier)
 * With search, type filters, read status filters, and date filters
 */

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, X } from 'lucide-react';
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useMarkVisibleNotificationsAsViewedMutation,
} from '@/store/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { Loader } from '@/components/ui/Loader';
import type { Notification, NotificationType } from '@/types';

// Notification type labels for display
const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  'DEAL_ASSIGNED': 'New Deal Assigned',
  'DEAL_REASSIGNED': 'Deal Reassigned',
  'SOW_READY_FOR_REVIEW': 'SOW Ready for Review',
  'DEAL_STATUS_UPDATED': 'Deal Status Updated',
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

// Get time period for grouping
const getTimePeriod = (dateString: string): 'today' | 'yesterday' | 'thisWeek' | 'earlier' => {
  const now = new Date();
  const date = new Date(dateString);

  // Reset hours for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (notifDate >= today) return 'today';
  if (notifDate >= yesterday) return 'yesterday';
  if (notifDate >= weekAgo) return 'thisWeek';
  return 'earlier';
};

// Group notifications by time period
const groupNotificationsByPeriod = (notifications: Notification[]) => {
  const groups: {
    today: Notification[];
    yesterday: Notification[];
    thisWeek: Notification[];
    earlier: Notification[];
  } = {
    today: [],
    yesterday: [],
    thisWeek: [],
    earlier: [],
  };

  notifications.forEach((notification) => {
    const period = getTimePeriod(notification.created_at);
    groups[period].push(notification);
  });

  return groups;
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate: (dealId: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onNavigate }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.deal_id) {
      onNavigate(notification.deal_id);
    }
  };

  const typeLabel = NOTIFICATION_TYPE_LABELS[notification.type] || notification.title;

  return (
    <div
      onClick={handleClick}
      className={`relative flex items-start justify-between gap-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
        !notification.is_read ? 'bg-blue-50/30' : ''
      }`}
    >
      {/* Left side: Unread indicator + Content */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Unread indicator */}
        {!notification.is_read && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
        )}

        {/* Content */}
        <div className={`flex-1 min-w-0 ${notification.is_read ? 'ml-5' : ''}`}>
          {/* Title row with deal badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-800">{typeLabel}</span>
            {notification.deal_name && (
              <span className="px-2 py-0.5 text-xs font-medium text-neutral-800 bg-white border border-neutral-200 rounded">
                {notification.deal_name}
              </span>
            )}
          </div>

          {/* Message/Subtitle */}
          <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
            {notification.message}
          </p>
        </div>
      </div>

      {/* Right side: Time */}
      <span className="flex-shrink-0 text-xs text-neutral-400 whitespace-nowrap">
        {formatRelativeTime(notification.created_at)}
      </span>
    </div>
  );
}

interface NotificationGroupProps {
  title: string;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onNavigate: (dealId: string) => void;
}

function NotificationGroup({ title, notifications, onMarkAsRead, onNavigate }: NotificationGroupProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Group Title */}
      <div className="flex items-center gap-4 mb-2">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{title}</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {/* Notifications */}
      <div className="divide-y divide-neutral-100">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

// Filter dropdown component
interface FilterDropdownProps {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((o) => o.value === value);
  const displayValue = selectedOption?.label || label;
  const hasValue = value !== null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 h-10 text-sm rounded-md border transition-colors ${
          hasValue
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-700 hover:border-neutral-400'
        }`}
      >
        <span className="truncate">{displayValue}</span>
        {hasValue ? (
          <X
            className="w-3.5 h-3.5 ml-1 hover:text-violet-900"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[150px] py-1">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                value === option.value ? 'text-violet-600 font-medium' : 'text-neutral-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  // Local state for optimistic updates
  const [localNotifications, setLocalNotifications] = useState<Notification[]>([]);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);

  // Debounce search query for server-side filtering
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Fetch notifications with server-side filtering
  const { data: notificationsData, isLoading, isFetching } = useGetNotificationsQuery({
    limit: 100,
    search: debouncedSearchQuery || undefined,
    type: typeFilter || undefined,
    dateFilter: dateFilter || undefined,
    unreadOnly: readFilter === 'unread' ? true : undefined,
  });

  // Sync server data to local state when it arrives
  useEffect(() => {
    if (notificationsData?.notifications) {
      setLocalNotifications(notificationsData.notifications);
      setLocalUnreadCount(notificationsData.unread_count || 0);
    }
  }, [notificationsData]);

  // Mutations
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [markVisibleAsViewed] = useMarkVisibleNotificationsAsViewedMutation();

  // Track if we've already marked notifications as viewed on this page load
  const hasMarkedAsViewedRef = useRef(false);

  // Auto-mark all visible unread notifications as read when page loads
  useEffect(() => {
    if (localNotifications.length > 0 && !hasMarkedAsViewedRef.current && !isLoading && !isFetching) {
      const unreadNotificationIds = localNotifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      if (unreadNotificationIds.length > 0) {
        hasMarkedAsViewedRef.current = true;

        // Optimistic update - mark all as read immediately in UI
        setLocalNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setLocalUnreadCount(0);

        // Sync to server in background
        markVisibleAsViewed(unreadNotificationIds).catch((error) => {
          console.error('Failed to mark notifications as viewed:', error);
        });
      }
    }
  }, [localNotifications, isLoading, isFetching, markVisibleAsViewed]);

  // Optimistic update: mark single notification as read
  const handleMarkAsRead = useCallback((notificationId: string) => {
    // Check if notification is already read
    const notification = localNotifications.find(n => n.id === notificationId);
    if (notification?.is_read) return;

    // Optimistic update - immediately update local state
    setLocalNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setLocalUnreadCount(prev => Math.max(0, prev - 1));

    // Sync to server (don't await, let it happen in background)
    markAsRead(notificationId).catch((error) => {
      console.error('Failed to mark notification as read:', error);
    });
  }, [localNotifications, markAsRead]);

  // Optimistic update: mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    // Optimistic update - immediately update local state
    setLocalNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setLocalUnreadCount(0);

    // Sync to server
    markAllAsRead().catch((error) => {
      console.error('Failed to mark all notifications as read:', error);
    });
  }, [markAllAsRead]);

  const handleNavigate = (dealId: string) => {
    router.push(`/deals/${dealId}`);
  };

  // Apply client-side filter for read status (read only - unread is handled server-side)
  const filteredNotifications = useMemo(() => {
    let notifications = localNotifications;

    // Client-side filter for "read" status (server handles "unread")
    if (readFilter === 'read') {
      notifications = notifications.filter((n) => n.is_read);
    }

    return notifications;
  }, [localNotifications, readFilter]);

  // Group filtered notifications
  const groupedNotifications = useMemo(
    () => groupNotificationsByPeriod(filteredNotifications),
    [filteredNotifications]
  );

  // Filter options
  const typeOptions = [
    { value: 'DEAL_ASSIGNED', label: 'New Deal Assigned' },
    { value: 'DEAL_REASSIGNED', label: 'Deal Reassigned' },
    { value: 'SOW_READY_FOR_REVIEW', label: 'SOW Ready for Review' },
    { value: 'DEAL_STATUS_UPDATED', label: 'Status Updated' },
  ];

  const readOptions = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' },
  ];

  const dateOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This Week' },
  ];

  return (
    <div className="h-full flex flex-col p-6">
      {/* Notification Center Header */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-neutral-900">Notification Center</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Check the status of all current deals here</p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search Input - searches notification type and deal name */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            className="w-48 pl-9 pr-3 h-10 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        {/* Type Filter */}
        <FilterDropdown
          label="All Types"
          value={typeFilter}
          options={typeOptions}
          onChange={setTypeFilter}
        />

        {/* Read Status Filter */}
        <FilterDropdown
          label="All"
          value={readFilter}
          options={readOptions}
          onChange={setReadFilter}
        />

        {/* Date Filter */}
        <FilterDropdown
          label="Date"
          value={dateFilter}
          options={dateOptions}
          onChange={setDateFilter}
        />

        {/* Mark All as Read */}
        {localUnreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="ml-auto px-4 py-2 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || isFetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader text="Loading notifications..." />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <p className="text-lg font-medium text-gray-900">No notifications</p>
            <p className="text-sm mt-1">
              {debouncedSearchQuery || typeFilter || readFilter || dateFilter
                ? 'No notifications match your filters'
                : "You don't have any notifications yet"}
            </p>
          </div>
        ) : (
          <>
            <NotificationGroup
              title="Today"
              notifications={groupedNotifications.today}
              onMarkAsRead={handleMarkAsRead}
              onNavigate={handleNavigate}
            />
            <NotificationGroup
              title="Yesterday"
              notifications={groupedNotifications.yesterday}
              onMarkAsRead={handleMarkAsRead}
              onNavigate={handleNavigate}
            />
            <NotificationGroup
              title="This Week"
              notifications={groupedNotifications.thisWeek}
              onMarkAsRead={handleMarkAsRead}
              onNavigate={handleNavigate}
            />
            <NotificationGroup
              title="Earlier"
              notifications={groupedNotifications.earlier}
              onMarkAsRead={handleMarkAsRead}
              onNavigate={handleNavigate}
            />
          </>
        )}
      </div>
    </div>
  );
}
