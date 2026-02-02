/**
 * Avoma Meeting Item Component
 *
 * Single meeting item for display in lists
 */

'use client';

import React from 'react';
import { Video, Calendar, Clock, ExternalLink } from 'lucide-react';

export interface AvomaMeeting {
  meeting_id: string;
  title: string;
  date: string;
  duration_minutes: number;
  participants: string[];
  has_recording: boolean;
  has_transcript: boolean;
  has_notes: boolean;
  meeting_url: string;
  organizer_email: string;
  processing_status: string;
  state: string;
  synced_at: string;
  selected: boolean;
  transcription_uuid?: string;
}

interface AvomaMeetingItemProps {
  meeting: AvomaMeeting;
  isSelected?: boolean;
  onToggle?: () => void;
  onViewTranscript?: (uuid: string, title: string) => void;
  showSelector?: boolean;
}

export function AvomaMeetingItem({ meeting, isSelected = false, onToggle, onViewTranscript, showSelector = true }: AvomaMeetingItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getBadges = () => {
    const badges = [];
    if (meeting.has_transcript) {
      badges.push('Transcript');
    }
    if (meeting.has_notes) {
      badges.push('Notes');
    }
    if (meeting.has_recording) {
      badges.push('Recording');
    }
    return badges;
  };

  const badges = getBadges();

  return (
    <div
      onClick={showSelector ? onToggle : undefined}
      className={`flex items-center gap-3 p-4 rounded-lg border border-gray-200 bg-white ${showSelector ? 'hover:bg-gray-50 cursor-pointer' : ''} transition-all`}
    >
      {/* Checkbox - only show when showSelector is true */}
      {showSelector && (
        <div className="flex-shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
          />
        </div>
      )}

      {/* Video Icon */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
          <Video className="w-5 h-5 text-primary-900" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <h4 className="text-sm font-semibold text-neutral-800 mb-1">
          {meeting.title}
        </h4>

        {/* Date, Time, Duration, Badges */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(meeting.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(meeting.date)}</span>
          </div>
          <div className="text-xs text-gray-600 font-medium">
            {formatDuration(meeting.duration_minutes)}
          </div>
          {badges.map((badge, index) => (
            <span
              key={index}
              className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 text-neutral-500"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 flex items-center gap-2 relative z-10">
        {/* View Transcript Button */}
        {meeting.has_transcript && onViewTranscript && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewTranscript(meeting.transcription_uuid || meeting.meeting_id, meeting.title);
            }}
            className="px-3 py-1.5 text-xs font-medium text-primary-900 bg-violet-100 rounded-lg hover:bg-violet-200 transition-colors"
          >
            View Transcript
          </button>
        )}
        {/* External Link */}
        <a
          href={meeting.meeting_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="w-10 h-10 flex items-center justify-center border border-neutral-300 rounded-lg text-gray-600 hover:text-primary-900 hover:border-primary-900 hover:bg-primary-50 transition-colors"
          title="Open in Avoma"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
