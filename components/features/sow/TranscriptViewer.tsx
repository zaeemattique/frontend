/**
 * Transcript Viewer Component
 *
 * Displays structured transcript with participants and timestamped segments
 */

'use client';

import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { useGetStructuredTranscriptQuery } from '@/store/services/api';
import { Loader } from '@/components/ui/Loader';

interface TranscriptViewerProps {
  transcriptionUuid: string;
  meetingTitle?: string;
  onClose: () => void;
}

interface Participant {
  id: string | number;
  name: string;
  initials: string;
  email?: string;
  role?: string;
}

interface TranscriptSegment {
  id: number;
  speaker_id: string | number;
  speaker_name: string;
  speaker_initials: string;
  timestamp: number;
  timestamp_formatted: string;
  text: string;
}

// Color palette for participant avatars
const AVATAR_COLORS = [
  { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
];

function getAvatarColor(index: number): { bg: string; text: string; border: string } {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  if (!color) {
    return { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
  }
  return color;
}

function ParticipantBadge({ participant, index }: { participant: Participant; index: number }) {
  const color = getAvatarColor(index);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-gray-100 min-w-[200px]">
      <div className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-semibold text-sm`}>
        {participant.initials}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-neutral-800">{participant.name}</span>
        {participant.role && (
          <span className="text-xs text-neutral-500">{participant.role}</span>
        )}
      </div>
    </div>
  );
}

function TranscriptSegmentItem({
  segment,
  speakerIndex
}: {
  segment: TranscriptSegment;
  speakerIndex: number;
}) {
  const color = getAvatarColor(speakerIndex);
  const hasAvatar = segment.speaker_initials && segment.speaker_initials !== '??';

  return (
    <div className="flex gap-4 py-4">
      {/* Timestamp */}
      <div className="flex-shrink-0 w-16 text-xs text-neutral-400 pt-1">
        {segment.timestamp_formatted}
      </div>

      {/* Avatar */}
      <div className="flex-shrink-0">
        {hasAvatar ? (
          <div className={`w-10 h-10 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-semibold text-sm`}>
            {segment.speaker_initials}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-sm">?</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-neutral-800 mb-1">
          {segment.speaker_name}
        </div>
        <p className="text-sm text-neutral-600 leading-relaxed">
          {segment.text}
        </p>
      </div>
    </div>
  );
}

export function TranscriptViewer({ transcriptionUuid, meetingTitle, onClose }: TranscriptViewerProps) {
  const [activeTab, setActiveTab] = React.useState<'transcript' | 'summary'>('transcript');

  const { data, isLoading, error } = useGetStructuredTranscriptQuery(transcriptionUuid, {
    skip: !transcriptionUuid,
  });

  // Build speaker index map for consistent colors
  const speakerIndexMap = React.useMemo(() => {
    const map = new Map<string | number, number>();
    if (data?.speakers) {
      data.speakers.forEach((speaker, index) => {
        map.set(speaker.speaker_id, index);
      });
    }
    return map;
  }, [data?.speakers]);

  // Extract participants from response
  const participants: Participant[] = React.useMemo(() => {
    if (data?.speakers) {
      return data.speakers.map((s: any) => ({
        id: s.speaker_id,
        name: s.name,
        initials: s.initials,
        email: s.email,
        role: s.role,
      }));
    }
    return [];
  }, [data]);

  // Extract segments from response
  const segments: TranscriptSegment[] = React.useMemo(() => {
    if (data?.segments) {
      return data.segments.map((s: any, i: number) => ({
        id: s.id ?? i,
        speaker_id: s.speaker_id,
        speaker_name: s.speaker_name,
        speaker_initials: s.speaker_initials,
        timestamp: s.timestamp ?? s.start_time ?? 0,
        timestamp_formatted: s.timestamp_formatted ?? s.start_timestamp ?? '00:00',
        text: s.text,
      }));
    }
    return [];
  }, [data]);

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-neutral-800">
          {meetingTitle || 'Meeting Transcript'}
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader text="Loading transcript..." />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-neutral-500">
            <p>Failed to load transcript. Please try again.</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Participants Section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-neutral-500 mb-3">
                Participants ({participants.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {participants.map((participant, index) => (
                  <ParticipantBadge
                    key={participant.id}
                    participant={participant}
                    index={index}
                  />
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('transcript')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'transcript'
                    ? 'text-primary-900 border-primary-900'
                    : 'text-neutral-500 border-transparent hover:text-neutral-700'
                }`}
              >
                Transcript
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'summary'
                    ? 'text-primary-900 border-primary-900'
                    : 'text-neutral-500 border-transparent hover:text-neutral-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI Summary
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'transcript' ? (
              <div className="divide-y divide-gray-100">
                {segments.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500">
                    No transcript segments available.
                  </div>
                ) : (
                  segments.map((segment) => (
                    <TranscriptSegmentItem
                      key={segment.id}
                      segment={segment}
                      speakerIndex={speakerIndexMap.get(segment.speaker_id) ?? 0}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-neutral-500">
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-neutral-300" />
                <p>AI Summary coming soon...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
