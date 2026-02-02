/**
 * Manage Users Page
 *
 * User management with role assignment:
 * - Leadership
 * - Solutions Architect (SA)
 * - Account Executive (AE)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2, Plus, X, UserX, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  useGetUsersQuery,
  useUpdateUserGroupsMutation,
  useCreateUserMutation,
  useDeactivateUserMutation,
} from '@/store/services/api';
import { Button } from '@/components/ui/Button';
import type { UserRole } from '@/types';

// Role definitions
const ROLES = [
  { value: 'Leadership' as const, label: 'Leadership' },
  { value: 'SA' as const, label: 'SA' },
  { value: 'AE' as const, label: 'AE' },
];

type RoleValue = UserRole;

// Role Dropdown Component for table rows
function RoleDropdown({
  value,
  onChange,
  disabled = false,
  isLoading = false,
}: {
  value: RoleValue | null;
  onChange: (role: RoleValue) => void;
  disabled?: boolean;
  isLoading?: boolean;
}) {
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

  const selectedLabel = ROLES.find((r) => r.value === value)?.label || 'Select Role';

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isLoading) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (role: RoleValue) => {
    onChange(role);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-flex items-center gap-2" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={`
          flex items-center gap-1 text-sm text-neutral-800
          ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-neutral-600'}
        `}
      >
        <span>{selectedLabel}</span>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
        ) : (
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {isOpen && !isLoading && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[140px] bg-white rounded-lg shadow-lg border border-gray-200 py-1"
          style={{ zIndex: 9999 }}
        >
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => handleSelect(role.value)}
              className={`
                w-full flex items-center justify-between gap-2 px-3 py-2 text-sm
                transition-colors
                ${value === role.value
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <span>{role.label}</span>
              {value === role.value && (
                <Check className="w-4 h-4 text-violet-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Role Filter Dropdown for the filter bar (Multi-Select)
function RoleFilterDropdown({
  value,
  onChange,
}: {
  value: RoleValue[];
  onChange: (roles: RoleValue[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<RoleValue[]>(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state with prop when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRoles(value);
    }
  }, [isOpen, value]);

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

  // Generate display label based on selections
  const getDisplayLabel = () => {
    if (value.length === 0) return 'Role';
    if (value.length === 1) return ROLES.find((r) => r.value === value[0])?.label || 'Role';
    return `${value.length} Roles`;
  };

  const handleReset = () => {
    setSelectedRoles([]);
  };

  const handleApply = () => {
    onChange(selectedRoles);
    setIsOpen(false);
  };

  const handleCheckboxChange = (role: RoleValue) => {
    // Multi-select - toggle role in array
    if (selectedRoles.includes(role)) {
      setSelectedRoles(selectedRoles.filter((r) => r !== role));
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const hasSelection = value.length > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1 px-3 h-12 text-sm rounded-md border transition-colors
          ${hasSelection
            ? 'bg-violet-50 border-violet-200 text-violet-700'
            : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
          }
        `}
      >
        <span>{getDisplayLabel()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[200px] bg-white rounded-xl shadow-lg border border-gray-200 p-4"
          style={{ zIndex: 9999 }}
        >
          {/* Header */}
          <h3 className="text-base font-semibold text-neutral-900 mb-4">Role</h3>

          {/* Checkbox Options */}
          <div className="space-y-3 mb-4">
            {ROLES.map((role) => (
              <label
                key={role.value}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.value)}
                  onChange={() => handleCheckboxChange(role.value)}
                  className="w-5 h-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-neutral-800">{role.label}</span>
              </label>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Deactivate User Confirmation Modal
function DeactivateUserModal({
  isOpen,
  onClose,
  onConfirm,
  isDeactivating,
  userName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeactivating: boolean;
  userName: string;
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeactivating) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isDeactivating]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeactivating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Deactivate User</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeactivating}
            className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-700">
                Are you sure you want to deactivate <span className="font-semibold">{userName}</span>?
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                This user will no longer be able to log in. You can reactivate them later from the Deactivated Users page.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeactivating}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeactivating}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isDeactivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              'Deactivate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Add User Modal Component
function AddUserModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  apiError,
  onClearError,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { email: string; username: string; name: string; role: RoleValue }) => void;
  isSubmitting: boolean;
  apiError: string | null;
  onClearError: () => void;
}) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleValue | null>(null);
  const [errors, setErrors] = useState<{ email?: string; username?: string; name?: string; role?: string }>({});
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setUsername('');
      setName('');
      setRole(null);
      setErrors({});
      onClearError();
    }
  }, [isOpen, onClearError]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; username?: string; name?: string; role?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      newErrors.username = 'Username cannot be an email address';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, dots, underscores, and hyphens';
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClearError(); // Clear any previous API error
    if (validateForm() && role) {
      onSubmit({ email: email.trim(), username: username.trim(), name: name.trim(), role });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">Add New User</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* API Error Alert */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Failed to create user</p>
                <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
              </div>
              <button
                type="button"
                onClick={onClearError}
                className="text-red-400 hover:text-red-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              placeholder="john.doe"
              className={`w-full h-11 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-neutral-50 disabled:cursor-not-allowed ${
                errors.username ? 'border-red-300' : 'border-neutral-300'
              }`}
            />
            {errors.username && (
              <p className="mt-1 text-xs text-red-600">{errors.username}</p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              Cannot be an email address. Use letters, numbers, dots, underscores, or hyphens.
            </p>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              placeholder="user@example.com"
              className={`w-full h-11 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-neutral-50 disabled:cursor-not-allowed ${
                errors.email ? 'border-red-300' : 'border-neutral-300'
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="John Doe"
              className={`w-full h-11 px-3 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:bg-neutral-50 disabled:cursor-not-allowed ${
                errors.name ? 'border-red-300' : 'border-neutral-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Role
            </label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    role === r.value
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  } ${isSubmitting ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    disabled={isSubmitting}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span className="text-sm text-neutral-800">{r.label}</span>
                </label>
              ))}
            </div>
            {errors.role && (
              <p className="mt-1 text-xs text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              A temporary password will be sent to the user&apos;s email. They will be required to change it on first login.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Add User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleValue[]>([]);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<{ id: string; name: string } | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Only fetch active users (enabled=true)
  const { data: usersData, isLoading, error } = useGetUsersQuery(
    roleFilter.length > 0
      ? { roles: roleFilter, enabled: true }
      : { enabled: true }
  );
  const [updateUserGroups] = useUpdateUserGroupsMutation();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [deactivateUser] = useDeactivateUserMutation();

  useEffect(() => {
    document.title = 'Manage Users - OSCAR';
    return () => {
      document.title = 'OSCAR';
    };
  }, []);

  const handleRoleChange = async (userId: string, newRole: RoleValue) => {
    setUpdatingUserId(userId);
    try {
      await updateUserGroups({
        id: userId,
        groups: [newRole],
      }).unwrap();
    } catch (error) {
      console.error('Failed to update user role:', error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleAddUser = async (data: { email: string; username: string; name: string; role: RoleValue }) => {
    setCreateError(null);
    try {
      await createUser({
        email: data.email,
        username: data.username,
        name: data.name,
        role: data.role,
      }).unwrap();
      setIsAddModalOpen(false);
    } catch (error: unknown) {
      const err = error as { data?: { error?: string }; message?: string };
      setCreateError(err.data?.error || err.message || 'Failed to create user');
    }
  };

  const handleClearError = () => {
    setCreateError(null);
  };

  const handleDeactivateClick = (userId: string, userName: string) => {
    setUserToDeactivate({ id: userId, name: userName });
  };

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return;

    setIsDeactivating(true);
    try {
      await deactivateUser(userToDeactivate.id).unwrap();
      setUserToDeactivate(null);
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleCloseDeactivateModal = () => {
    if (!isDeactivating) {
      setUserToDeactivate(null);
    }
  };

  // Get users from the response
  const users = usersData || [];
  const usersList = Array.isArray(users) ? users : [];

  // Filter users based on search query (role filter is handled server-side via API)
  const filteredUsers = usersList.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load users</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 min-h-0">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Manage Users</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your users and their permissions here.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-10 pr-4 text-sm bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        {/* Role Filter */}
        <RoleFilterDropdown value={roleFilter} onChange={setRoleFilter} />

        {/* View Deactivated Users Link */}
        <Link
          href="/users/deactivated"
          className="flex items-center gap-2 px-3 h-12 text-sm text-neutral-600 hover:text-neutral-800 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
        >
          <UserX className="w-4 h-4" />
          Deactivated
        </Link>

        {/* Add User Button */}
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Users Table - flex-1 to take remaining height */}
      <div className="flex-1 bg-white rounded-lg border border-neutral-200 overflow-visible">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="px-6 py-4 text-left text-sm font-medium text-neutral-500">
                User
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-neutral-500">
                Email
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-neutral-500">
                Role
              </th>
              <th className="px-6 py-4 text-right text-sm font-medium text-neutral-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                  {searchQuery || roleFilter.length > 0 ? 'No users match your filters' : 'No users found'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.id || user.username}
                  className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-neutral-900">
                      {user.name || user.username || 'Unknown User'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-neutral-600">
                      {user.email || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <RoleDropdown
                      value={user.role}
                      onChange={(role) => handleRoleChange(user.id || user.username || '', role)}
                      isLoading={updatingUserId === (user.id || user.username)}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeactivateClick(
                        user.id || user.username || '',
                        user.name || user.username || 'this user'
                      )}
                      className="text-red-600 hover:text-red-700 p-1"
                      title="Deactivate user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Error Toast for Create User */}
      {createError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <span className="text-sm">{createError}</span>
          <button
            type="button"
            onClick={() => setCreateError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddUser}
        isSubmitting={isCreating}
        apiError={createError}
        onClearError={handleClearError}
      />

      {/* Deactivate User Confirmation Modal */}
      <DeactivateUserModal
        isOpen={userToDeactivate !== null}
        onClose={handleCloseDeactivateModal}
        onConfirm={handleConfirmDeactivate}
        isDeactivating={isDeactivating}
        userName={userToDeactivate?.name || ''}
      />
    </div>
  );
}
