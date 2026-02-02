/**
 * useAdmin Hook
 *
 * Custom hook for admin-specific functionality
 * Leadership role acts as admin
 */

'use client';

import { usePermissions } from './usePermissions';

/**
 * Admin privileges hook
 * Leadership role is treated as admin
 */
export function useAdmin() {
  const { isLeadership, role } = usePermissions();

  return {
    isAdmin: isLeadership,
    role,
    hasAdminAccess: isLeadership,
  };
}
