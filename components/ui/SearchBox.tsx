/**
 * SearchBox Component
 *
 * Reusable search input with search icon
 */

'use client';

import { Search } from 'lucide-react';
import { Input } from './Input';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBox({
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}: SearchBoxProps) {
  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      icon={<Search className="w-5 h-5" />}
      className={className}
      inputClassName="bg-white"
    />
  );
}
