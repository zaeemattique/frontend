/**
 * Global Deal Search Component
 *
 * Search box with dropdown menu for searching deals globally.
 * Two modes:
 * 1. Dropdown mode (Deal Details/SOW pages): Shows search results in dropdown, clicking navigates
 * 2. Filter mode (Deals list page): Filters the deals table via context
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { useSearchDealsQuery } from '@/store/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { getStatusLabel } from '@/utils/dealStatus';
import type { Deal } from '@/types';

interface GlobalDealSearchProps {
  className?: string;
  placeholder?: string;
  /**
   * Mode of operation:
   * - 'dropdown': Shows results in dropdown, clicking navigates to deal (default)
   * - 'filter': Updates external state for filtering (used on Deals list page)
   */
  mode?: 'dropdown' | 'filter';
  /**
   * For filter mode: external search value
   */
  value?: string;
  /**
   * For filter mode: callback when search value changes
   */
  onChange?: (value: string) => void;
}

export function GlobalDealSearch({
  className = '',
  placeholder = 'Search deals...',
  mode = 'dropdown',
  value,
  onChange,
}: GlobalDealSearchProps) {
  const router = useRouter();
  const [internalQuery, setInternalQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use external value for filter mode, internal state for dropdown mode
  const searchQuery = mode === 'filter' ? (value ?? '') : internalQuery;
  const setSearchQuery = mode === 'filter' ? (onChange ?? setInternalQuery) : setInternalQuery;

  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  // Only search when query is 2+ characters (only for dropdown mode)
  const shouldSearch = mode === 'dropdown' && debouncedSearchQuery.length >= 2;

  const { data: searchData, isLoading, isFetching } = useSearchDealsQuery(
    { query: debouncedSearchQuery, limit: 10 },
    { skip: !shouldSearch }
  );

  const isSearching = mode === 'dropdown' && (isLoading || isFetching || (searchQuery.length >= 2 && searchQuery !== debouncedSearchQuery));
  const deals = searchData?.results || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (mode !== 'dropdown') return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mode]);

  // Open dropdown when there's input (only for dropdown mode)
  useEffect(() => {
    if (mode === 'dropdown' && searchQuery.length > 0) {
      setIsOpen(true);
    }
  }, [searchQuery, mode]);

  const handleDealClick = useCallback((deal: Deal) => {
    setInternalQuery('');
    setIsOpen(false);
    router.push(`/deals/${deal.id}`);
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => mode === 'dropdown' && searchQuery.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
        />
      </div>

      {/* Search Results Dropdown (only for dropdown mode) */}
      {mode === 'dropdown' && isOpen && searchQuery.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Type at least 2 characters to search
            </div>
          ) : isSearching ? (
            <div className="px-4 py-3 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </div>
          ) : deals.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No deals found
            </div>
          ) : (
            <div className="py-2">
              {deals.map((deal: Deal) => (
                <button
                  key={deal.id}
                  onClick={() => handleDealClick(deal)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm font-medium text-neutral-800 truncate">
                    {deal.dealname || 'Untitled Deal'}
                  </div>
                  <div className="text-xs font-semibold text-neutral-500 mt-0.5">
                    {getStatusLabel(deal.status || deal.sow_gen_progress || deal.phase || (deal.assignee ? 'SA_ASSIGNED' : 'UN_ASSIGNED'))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
