/**
 * Avoma Meetings List Component
 *
 * Displays a list of Avoma meetings with selection functionality
 * Uses horizontal row layout for Generate SOW page
 */

'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { AvomaMeetingItem, AvomaMeeting } from './AvomaMeetingItem';

// Re-export the type for convenience
export type { AvomaMeeting } from './AvomaMeetingItem';

interface AvomaMeetingsListProps {
  meetings: AvomaMeeting[];
  selectedMeetings?: string[];
  onMeetingToggle?: (meetingId: string) => void;
  lastSyncTime?: string;
  onSync?: () => void;
  isSyncing?: boolean;
  error?: string | null;
}

export function AvomaMeetingsList({
  meetings,
  selectedMeetings = [],
  onMeetingToggle,
  lastSyncTime,
  onSync,
  isSyncing = false,
  error,
}: AvomaMeetingsListProps) {
  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return 'Never';

    const now = new Date();
    const sync = new Date(syncTime);
    const diffMs = now.getTime() - sync.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-4 bg-neutral-50 border border-neutral-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Add relevant calls and transcripts
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-600">
            Last sync: {formatLastSync(lastSyncTime)}
          </span>
          {onSync && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-900 bg-white border border-primary-900 rounded-lg hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Avoma'}
            </button>
          )}
        </div>
      </div>

      {/* Meetings Row (horizontal layout) */}
      {meetings.length === 0 ? (
        <div className="text-center py-8 text-neutral-600 text-sm">
          No Avoma meetings found for this deal
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {meetings.map((meeting) => {
            const isSelected = selectedMeetings.includes(meeting.meeting_id) || meeting.selected;

            return (
              <div key={meeting.meeting_id} className="w-[450px]">
                <AvomaMeetingItem
                  meeting={meeting}
                  isSelected={isSelected}
                  onToggle={() => onMeetingToggle?.(meeting.meeting_id)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
