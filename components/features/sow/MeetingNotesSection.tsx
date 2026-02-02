/**
 * Meeting Notes Section Component
 *
 * Displays parsed meeting notes as expandable accordion sections
 * Shows categories like Meeting Summary, Pain Points, Blockers, AWS Services, etc.
 */

'use client';

import React, { useState } from 'react';
import {
  ChevronRight,
  FileText,
  Lightbulb,
  CheckSquare,
  Calendar,
  Info,
  Target,
  AlertCircle,
  Star,
  UserCheck,
  Users,
  Clock,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

// Types for meeting notes sections
export interface MeetingNoteItem {
  text: string;
  speaker?: string;
  timestamp?: number | null;
}

export interface MeetingNoteSection {
  id: string;
  title: string;
  icon: string;
  items: MeetingNoteItem[];
  count: number;
  category: string;
}

interface MeetingNotesSectionProps {
  sections: MeetingNoteSection[];
  isLoading?: boolean;
  error?: string | null;
}

// Icon mapping function
function getIconComponent(iconName: string): React.ElementType {
  const iconMap: Record<string, React.ElementType> = {
    'file-text': FileText,
    'lightbulb': Lightbulb,
    'check-square': CheckSquare,
    'calendar': Calendar,
    'info': Info,
    'target': Target,
    'alert-circle': AlertCircle,
    'star': Star,
    'user-check': UserCheck,
    'users': Users,
    'clock': Clock,
    'message-square': MessageSquare,
    'alert-triangle': AlertTriangle,
  };

  return iconMap[iconName] || FileText;
}

// Get icon color based on category
function getIconColor(category: string): string {
  const colorMap: Record<string, string> = {
    'summary': 'text-gray-500',
    'pain_point': 'text-red-500',
    'risk': 'text-amber-500',
    'action_item': 'text-blue-500',
    'key_takeaways': 'text-green-500',
    'timeline': 'text-purple-500',
    'need': 'text-indigo-500',
    'background': 'text-gray-500',
    'champion': 'text-yellow-500',
    'decision_making': 'text-teal-500',
    'competitor': 'text-orange-500',
    'feedback': 'text-cyan-500',
  };

  return colorMap[category] || 'text-gray-500';
}

// Single accordion item component
function AccordionItem({ section }: { section: MeetingNoteSection }) {
  const [isOpen, setIsOpen] = useState(false);
  const IconComponent = getIconComponent(section.icon);
  const iconColor = getIconColor(section.category);

  const displayTitle = section.count > 0
    ? `${section.title} (${section.count})`
    : section.title;

  return ( 
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <IconComponent className={`w-5 h-5 ${iconColor}`} />
          <span className="text-sm font-medium text-gray-900">{displayTitle}</span>
        </div>
        <ChevronRight
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isOpen && section.items.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <ul className="mt-3 space-y-2">
            {section.items.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-gray-400 mt-1">•</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{item.text}</p>
                  {item.speaker && (
                    <p className="text-xs text-gray-500 mt-0.5">— {item.speaker}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {isOpen && section.items.length === 0 && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="mt-3 text-sm text-gray-500 italic">No items in this section</p>
        </div>
      )}
    </div>
  );
}

export function MeetingNotesSection({
  sections,
  isLoading = false,
  error = null,
}: MeetingNotesSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-gray-200 rounded-lg bg-white p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">No meeting notes available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <AccordionItem key={section.id} section={section} />
      ))}
    </div>
  );
}
