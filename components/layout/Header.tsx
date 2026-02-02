/**
 * Header Component
 *
 * Top navigation bar
 * Shows: Page title, notifications bell, user info, profile dropdown
 * For Deal pages (list, details) and SOW pages, shows global search instead of page title
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { LogOut, House, Folder, Box, Files, Plug, LucideIcon, Bell as BellIcon } from 'lucide-react';
import { NotificationDropdown } from '@/components/features/notifications/NotificationDropdown';
import { GlobalDealSearch } from '@/components/ui/GlobalDealSearch';
import { useDealsSearch } from '@/contexts/DealsSearchContext';

// Map routes to page info with icons
const getPageInfo = (pathname: string): { title: string; icon: LucideIcon } => {
  if (pathname === '/') return { title: 'Dashboard', icon: House };
  if (pathname.startsWith('/deals')) return { title: 'Deals', icon: Folder };
  if (pathname.startsWith('/knowledge-base')) return { title: 'Knowledge Base', icon: Box };
  if (pathname.startsWith('/templates')) return { title: 'Templates', icon: Files };
  if (pathname.startsWith('/integrations')) return { title: 'Integrations', icon: Plug };
  if (pathname.startsWith('/generate-sow')) return { title: 'Generate SOW', icon: Files };
  if (pathname.startsWith('/document-templates')) return { title: 'Document Templates', icon: Files };
  if (pathname.startsWith('/users')) return { title: 'Users', icon: House };
  if (pathname.startsWith('/notifications')) return { title: 'Notifications', icon: BellIcon };
  return { title: 'Dashboard', icon: House };
};

// Determine the search mode based on pathname
type SearchMode = 'dropdown' | 'filter';

const getSearchMode = (pathname: string): SearchMode => {
  // Deals list page - filter mode (search filters the table)
  if (pathname === '/deals') return 'filter';
  // All other pages - dropdown mode (search shows results dropdown, clicking navigates)
  return 'dropdown';
};

export function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const pageInfo = getPageInfo(pathname);
  const PageIcon = pageInfo.icon;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchMode = getSearchMode(pathname);

  // Get deals search context (only used in filter mode)
  // Use try-catch pattern to handle when context is not available
  let dealsSearchContext: { searchQuery: string; setSearchQuery: (q: string) => void } | null = null;
  try {
    dealsSearchContext = useDealsSearch();
  } catch {
    // Context not available, that's fine for non-deals pages
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await signOut();
  };

  const userName = (user?.name as string) || 'User';
  const userEmail = (user?.email as string) || 'user@example.com';

  const renderLeftContent = () => {
    // Deals list page - filter mode (search filters the table)
    if (searchMode === 'filter' && dealsSearchContext) {
      return (
        <GlobalDealSearch
          className="w-80"
          placeholder="Search Deal"
          mode="filter"
          value={dealsSearchContext.searchQuery}
          onChange={dealsSearchContext.setSearchQuery}
        />
      );
    }

    // All other pages - dropdown mode (global deal search)
    return (
      <GlobalDealSearch
        className="w-80"
        placeholder="Search Deal"
        mode="dropdown"
      />
    );
  };

  return (
    <header className="header">
      {renderLeftContent()}

      <div className="flex items-center gap-2">
        {/* Notifications Bell */}
        <NotificationDropdown />

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
            <span className="text-sm font-medium text-gray-700">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* User Info */}
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-900">{userName}</span>
            <span className="text-xs text-gray-500">{userEmail}</span>
          </div>

          {/* Dropdown Arrow */}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
        </div>
      </div>
    </header>
  );
}
