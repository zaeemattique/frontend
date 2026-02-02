/**
 * Assignee Dropdown Component
 *
 * Dropdown for selecting assignees with avatar display
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface User {
  id: string;
  name: string;
  initials: string;
  color: string;
}

interface AssigneeDropdownProps {
  value?: User | null;
  onChange: (user: User | null) => void;
  users: User[];
  className?: string;
}

export function AssigneeDropdown({
  value,
  onChange,
  users,
  className = ''
}: AssigneeDropdownProps) {
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

  const handleSelect = (user: User | null) => {
    onChange(user);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors w-full cursor-pointer"
      >
        {value ? (
          <>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: value.color }}
            >
              {value.initials}
            </div>
            <span>{value.name}</span>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300" />
            <span className="text-gray-500">Unassigned</span>
          </>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-64 overflow-y-auto">
          {/* Unassigned option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSelect(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300" />
            <span>Unassigned</span>
          </button>

          {/* User options */}
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(user);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: user.color }}
              >
                {user.initials}
              </div>
              <span>{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
