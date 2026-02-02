/**
 * Template Selection Item Component
 *
 * Displays a selectable template item in the SOW generation flow
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';

interface TemplateSelectionItemProps {
  id: string;
  name: string;
  description?: string;
  previewImage?: string;
  isSelected: boolean;
  onClick: () => void;
}

export function TemplateSelectionItem({
  name,
  description,
  isSelected,
  onClick,
}: TemplateSelectionItemProps) {
  return (
    <button
      onClick={onClick}
      className={`relative bg-white rounded-lg border-2 overflow-hidden transition-all hover:shadow-md ${
        isSelected ? 'border-primary-900 ring-2 ring-primary-900 ring-opacity-50' : 'border-gray-200'
      }`}
      style={{ width: '180px', minWidth: '180px' }}
    >
      {/* Template Preview Image - Always use sow.png */}
      <div className="aspect-[3/4] bg-white overflow-hidden relative">
        <Image
          src="/sow.png"
          alt={name}
          fill
          className="object-cover object-top"
          sizes="180px"
        />

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-primary-900 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>

      {/* Template Info */}
      <div className="p-3 border-t border-gray-200 text-left">
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}
      </div>
    </button>
  );
}
