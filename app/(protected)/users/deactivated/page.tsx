/**
 * Deactivated Users Page
 *
 * Lists all deactivated users with option to reactivate them
 */

'use client';

import { useState, useEffect } from 'react';
import { Search, ArrowLeft, Loader2, UserCheck, X } from 'lucide-react';
import Link from 'next/link';
import {
  useGetUsersQuery,
  useActivateUserMutation,
} from '@/store/services/api';

// Reactivate User Confirmation Modal
function ReactivateUserModal({
  isOpen,
  onClose,
  onConfirm,
  isActivating,
  userName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isActivating: boolean;
  userName: string;
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isActivating) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isActivating]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isActivating) {
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
          <h2 className="text-lg font-semibold text-neutral-900">Reactivate User</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isActivating}
            className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-700">
                Are you sure you want to reactivate <span className="font-semibold">{userName}</span>?
              </p>
              <p className="text-sm text-neutral-500 mt-2">
                This user will be able to log in again and access the system.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isActivating}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isActivating}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              'Reactivate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeactivatedUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userToActivate, setUserToActivate] = useState<{ id: string; name: string } | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  // Only fetch deactivated users (enabled=false)
  const { data: usersData, isLoading, error } = useGetUsersQuery({ enabled: false });
  const [activateUser] = useActivateUserMutation();

  useEffect(() => {
    document.title = 'Deactivated Users - OSCAR';
    return () => {
      document.title = 'OSCAR';
    };
  }, []);

  const handleActivateClick = (userId: string, userName: string) => {
    setUserToActivate({ id: userId, name: userName });
  };

  const handleConfirmActivate = async () => {
    if (!userToActivate) return;

    setIsActivating(true);
    try {
      await activateUser(userToActivate.id).unwrap();
      setUserToActivate(null);
    } catch (error) {
      console.error('Failed to activate user:', error);
    } finally {
      setIsActivating(false);
    }
  };

  const handleCloseActivateModal = () => {
    if (!isActivating) {
      setUserToActivate(null);
    }
  };

  // Get users from the response
  const users = usersData || [];
  const usersList = Array.isArray(users) ? users : [];

  // Filter users based on search query
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
        <p className="text-red-600">Failed to load deactivated users</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 min-h-0">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/users"
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900">Deactivated Users</h1>
        <p className="mt-1 text-sm text-neutral-500">
          These users have been deactivated and cannot log in. You can reactivate them if needed.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search deactivated users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-10 pr-4 text-sm bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
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
                  {searchQuery ? 'No deactivated users match your search' : 'No deactivated users'}
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
                    <span className="text-sm text-neutral-600">
                      {user.role || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleActivateClick(
                        user.id || user.username || '',
                        user.name || user.username || 'this user'
                      )}
                      className="text-green-600 hover:text-green-700 p-1"
                      title="Reactivate user"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reactivate User Confirmation Modal */}
      <ReactivateUserModal
        isOpen={userToActivate !== null}
        onClose={handleCloseActivateModal}
        onConfirm={handleConfirmActivate}
        isActivating={isActivating}
        userName={userToActivate?.name || ''}
      />
    </div>
  );
}
