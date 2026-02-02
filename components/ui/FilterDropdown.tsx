/**
 * Filter Dropdown Component
 *
 * Reusable dropdown filter with single or multi-select support
 */

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
  multiSelect?: boolean;
  placeholder?: string;
  className?: string;
}

export function FilterDropdown({
  label,
  options,
  value,
  onChange,
  multiSelect = false,
  placeholder,
  className = '',
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: string) => {
    if (multiSelect) {
      const currentValues = (value as string[]) || [];
      if (currentValues.includes(optionValue)) {
        const newValues = currentValues.filter((v) => v !== optionValue);
        onChange(newValues.length > 0 ? newValues : null);
      } else {
        onChange([...currentValues, optionValue]);
      }
    } else {
      onChange(value === optionValue ? null : optionValue);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const getDisplayValue = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return placeholder || label;
    }

    if (multiSelect && Array.isArray(value)) {
      if (value.length === 1) {
        const option = options.find((o) => o.value === value[0]);
        return option?.label || value[0];
      }
      return `${value.length} selected`;
    }

    const option = options.find((o) => o.value === value);
    return option?.label || (value as string);
  };

  const hasValue = value && (!Array.isArray(value) || value.length > 0);
  const isSelected = (optionValue: string) => {
    if (multiSelect && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 h-12 text-sm rounded-md border transition-colors ${
          hasValue
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
        }`}
      >
        <span className="max-w-[120px] truncate text-sm font-semibold">{getDisplayValue()}</span>
        {hasValue ? (
          <X
            className="w-3.5 h-3.5 ml-1 hover:text-violet-900"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 min-w-[180px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                isSelected(option.value)
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{option.label}</span>
              {isSelected(option.value) && (
                <Check className="w-4 h-4 text-violet-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Searchable Multi-Select Filter Component
 *
 * Dropdown with search box and checkbox multi-select
 */
interface SearchableMultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function SearchableMultiSelectFilter({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = 'Search',
  className = '',
}: SearchableMultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const getDisplayValue = () => {
    if (value.length === 0) {
      return placeholder || label;
    }
    if (value.length === 1) {
      const option = options.find((o) => o.value === value[0]);
      return option?.label || value[0];
    }
    return `${value.length} selected`;
  };

  const hasValue = value.length > 0;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 h-12 text-sm rounded-md border transition-colors ${
          hasValue
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
        }`}
      >
        <span className="max-w-[120px] truncate text-sm font-semibold">{getDisplayValue()}</span>
        {hasValue ? (
          <X
            className="w-3.5 h-3.5 ml-1 hover:text-violet-900"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[250px] max-h-80 flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No results found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggle(option.value)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        value.includes(option.value)
                          ? 'border-violet-600 bg-violet-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {value.includes(option.value) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-neutral-800">
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Date Range Filter Component
 */
interface DateRangeFilterProps {
  label: string;
  startDate: string | null;
  endDate: string | null;
  onChange: (startDate: string | null, endDate: string | null) => void;
  className?: string;
}

export function DateRangeFilter({
  label,
  startDate,
  endDate,
  onChange,
  className = '',
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasValue = startDate || endDate;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const getDisplayValue = () => {
    if (!hasValue) return label;
    if (startDate && endDate) {
      return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
    }
    if (startDate) return `From ${formatDateShort(startDate)}`;
    if (endDate) return `Until ${formatDateShort(endDate)}`;
    return label;
  };

  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 h-12 text-sm rounded-md border transition-colors ${
          hasValue
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
        }`}
      >
        <span className="max-w-[150px] truncate text-sm font-semibold">{getDisplayValue()}</span>
        {hasValue ? (
          <X
            className="w-3.5 h-3.5 ml-1 hover:text-violet-900"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-[240px]">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => onChange(e.target.value || null, endDate)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={endDate || ''}
                onChange={(e) => onChange(startDate, e.target.value || null)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Amount Range Filter Component
 */
interface AmountRangeFilterProps {
  label: string;
  minAmount: number | null;
  maxAmount: number | null;
  onChange: (minAmount: number | null, maxAmount: number | null) => void;
  className?: string;
}

/**
 * Sectioned Filter Dropdown Component
 *
 * Dropdown with options grouped into sections with headers
 */
export interface SectionedFilterOption {
  value: string;
  label: string;
}

export interface FilterSection {
  header: string;
  options: SectionedFilterOption[];
}

interface SectionedFilterDropdownProps {
  label: string;
  sections: FilterSection[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function SectionedFilterDropdown({
  label,
  sections,
  value,
  onChange,
  placeholder,
  className = '',
}: SectionedFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(value === optionValue ? null : optionValue);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  // Flatten all options to find the selected one
  const allOptions = sections.flatMap((section) => section.options);

  const getDisplayValue = () => {
    if (!value) {
      return placeholder || label;
    }
    const option = allOptions.find((o) => o.value === value);
    return option?.label || value;
  };

  const hasValue = !!value;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 h-12 text-sm rounded-md border transition-colors ${
          hasValue
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
        }`}
      >
        <span className="max-w-[140px] truncate text-sm font-semibold">{getDisplayValue()}</span>
        {hasValue ? (
          <X
            className="w-3.5 h-3.5 ml-1 hover:text-violet-900"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 min-w-[220px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-80 overflow-y-auto">
          {sections.map((section, sectionIndex) => (
            <div key={section.header}>
              {/* Section Header */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                {section.header}
              </div>
              {/* Section Options */}
              {section.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                    value === option.value
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check className="w-4 h-4 text-violet-600" />
                  )}
                </button>
              ))}
              {/* Divider between sections (except last) */}
              {sectionIndex < sections.length - 1 && (
                <div className="border-b border-gray-100" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Target Date Filter Component
 *
 * Radio button style filter for common date ranges
 */
export type TargetDateOption = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'next_week' | null;

interface TargetDateFilterProps {
  label: string;
  value: TargetDateOption;
  onChange: (value: TargetDateOption) => void;
  className?: string;
}

const TARGET_DATE_OPTIONS: { value: TargetDateOption; label: string }[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This Week' },
  { value: 'next_week', label: 'Next Week' },
];

export function TargetDateFilter({
  label,
  value,
  onChange,
  className = '',
}: TargetDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasValue = value !== null;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleSelect = (optionValue: TargetDateOption) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!hasValue) return label;
    const option = TARGET_DATE_OPTIONS.find((o) => o.value === value);
    return option?.label || label;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 h-12 text-sm rounded-md border transition-colors ${
          hasValue
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
        }`}
      >
        <span className="max-w-[150px] truncate text-sm font-semibold">{getDisplayValue()}</span>
        {hasValue ? (
          <X
            className="w-3.5 h-3.5 ml-1 hover:text-violet-900"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 min-w-[200px]">
          <div className="space-y-4">
            {TARGET_DATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className="flex items-center gap-3 cursor-pointer group w-full text-left"
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    value === option.value
                      ? 'border-violet-600 bg-violet-600'
                      : 'border-gray-300 group-hover:border-gray-400'
                  }`}
                >
                  {value === option.value && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-neutral-800">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get date range from target date option
export function getTargetDateRange(option: TargetDateOption): { start: string | null; end: string | null } {
  if (!option) return { start: null, end: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  switch (option) {
    case 'overdue': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: null, end: formatDate(yesterday) };
    }
    case 'today': {
      return { start: formatDate(today), end: formatDate(today) };
    }
    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { start: formatDate(tomorrow), end: formatDate(tomorrow) };
    }
    case 'this_week': {
      const startOfWeek = new Date(today);
      const dayOfWeek = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return { start: formatDate(startOfWeek), end: formatDate(endOfWeek) };
    }
    case 'next_week': {
      // Get next week's Sunday (start) through Saturday (end)
      const dayOfWeek = today.getDay();
      const daysUntilNextSunday = 7 - dayOfWeek;
      const startOfNextWeek = new Date(today);
      startOfNextWeek.setDate(today.getDate() + daysUntilNextSunday);
      const endOfNextWeek = new Date(startOfNextWeek);
      endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
      return { start: formatDate(startOfNextWeek), end: formatDate(endOfNextWeek) };
    }
    default:
      return { start: null, end: null };
  }
}

export function AmountRangeFilter({
  label,
  minAmount,
  maxAmount,
  onChange,
  className = '',
}: AmountRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasValue = minAmount !== null || maxAmount !== null;

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  const getDisplayValue = () => {
    if (!hasValue) return label;
    if (minAmount !== null && maxAmount !== null) {
      return `${formatAmount(minAmount)} - ${formatAmount(maxAmount)}`;
    }
    if (minAmount !== null) return `Min ${formatAmount(minAmount)}`;
    if (maxAmount !== null) return `Max ${formatAmount(maxAmount)}`;
    return label;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-3 h-12 text-sm rounded-md border transition-colors ${
          hasValue
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
        }`}
      >
        <span className="max-w-[150px] truncate text-sm font-semibold">{getDisplayValue()}</span>
        {hasValue ? (
          <X
            className="w-3.5 h-3.5 ml-1 hover:text-violet-900"
            onClick={handleClear}
          />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 min-w-[240px]">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Min Amount</label>
              <input
                type="number"
                value={minAmount ?? ''}
                onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null, maxAmount)}
                placeholder="$0"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Max Amount</label>
              <input
                type="number"
                value={maxAmount ?? ''}
                onChange={(e) => onChange(minAmount, e.target.value ? Number(e.target.value) : null)}
                placeholder="No limit"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-1.5 text-sm text-white bg-violet-600 rounded-md hover:bg-violet-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
