/**
 * Transcript Item Component
 *
 * Displays a single meeting transcript item with metadata
 */

'use client';

import React from 'react';
import { Video, Calendar, Clock } from 'lucide-react';

interface TranscriptItemProps {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  tags?: string[];
  isSelected?: boolean;
  onClick?: () => void;
}

export function TranscriptItem({
  id: _id,
  title,
  date,
  time,
  duration,
  tags = [],
  isSelected = false,
  onClick,
}: TranscriptItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
        isSelected
          ? 'border-primary-900 bg-primary-50'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onClick?.()}
          className="w-4 h-4 text-primary-900 border-gray-300 rounded focus:ring-primary-900"
        />
      </div>

      {/* Video Icon */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
          <Video className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">{title}</h4>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{time}</span>
          </div>
          <div className="text-xs text-gray-500">{duration}</div>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* External Link Icon */}
      <div className="flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Handle external link
          }}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
