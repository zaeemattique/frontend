/**
 * DealTitle Component
 *
 * Reusable component for displaying deal title with back navigation
 */

'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface DealTitleProps {
  dealName: string;
  onBack: () => void;
  subtitle?: string;
  className?: string;
}

export function DealTitle({ dealName, onBack, subtitle, className = '' }: DealTitleProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-neutral-800 truncate">{dealName}</h2>
      </div>
      {subtitle && (
        <p className="text-sm text-gray-600 ml-7">{subtitle}</p>
      )}
    </div>
  );
}
