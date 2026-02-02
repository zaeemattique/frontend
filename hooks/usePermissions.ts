/**
 * usePermissions Hook
 *
 * Role-based access control hook that provides feature flags based on user role.
 *
 * Role definitions:
 * - Leadership: Full access to all features (acts as admin)
 * - SA (Solutions Architect): Access to Dashboard, Deals, and SOW generation
 * - AE (Account Executive): Access to Dashboard and Deals only (no SOW generation)
 */

'use client';

import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUserGroups } from '@/store/slices/authSlice';
import type { UserRole } from '@/types';

/**
 * Permission flags interface
 */
export interface Permissions {
  // Role information
  role: UserRole | null;
  isLeadership: boolean;
  isSA: boolean;
  isAE: boolean;

  // Feature access flags
  canAccessDashboard: boolean;
  canAccessDeals: boolean;
  canAccessKnowledgeBase: boolean;
  canAccessTemplates: boolean;
  canAccessIntegrations: boolean;
  canAccessManageUsers: boolean;
  canGenerateSOW: boolean;
  canAssignDeals: boolean;

  // Sidebar visibility
  visibleSidebarItems: string[];

  // Route access check
  canAccessRoute: (route: string) => boolean;
}

/**
 * Extract role from user groups
 */
function getRoleFromGroups(groups: string[]): UserRole | null {
  if (groups.includes('Leadership')) return 'Leadership';
  if (groups.includes('SA')) return 'SA';
  if (groups.includes('AE')) return 'AE';
  return null;
}

/**
 * usePermissions Hook
 *
 * Returns permission flags based on the current user's role.
 * Use this hook to conditionally render UI elements and restrict access to features.
 */
export function usePermissions(): Permissions {
  const userGroups = useAppSelector(selectUserGroups);

  return useMemo(() => {
    const role = getRoleFromGroups(userGroups);
    const isLeadership = role === 'Leadership';
    const isSA = role === 'SA';
    const isAE = role === 'AE';

    // Leadership has full access (acts as admin)
    // SA has access to Dashboard, Deals, and SOW generation
    // AE has access to Dashboard and Deals only

    // Feature access flags
    const canAccessDashboard = true; // Everyone can access dashboard
    const canAccessDeals = true; // Everyone can access deals
    const canAccessKnowledgeBase = isLeadership;
    const canAccessTemplates = isLeadership;
    const canAccessIntegrations = isLeadership;
    const canAccessManageUsers = isLeadership;
    const canGenerateSOW = isLeadership || isSA; // AE cannot generate SOW
    const canAssignDeals = isLeadership;

    // Build visible sidebar items list
    const visibleSidebarItems: string[] = ['Dashboard', 'Deals', 'Notifications'];
    if (canAccessKnowledgeBase) visibleSidebarItems.push('Knowledge Base');
    if (canAccessTemplates) visibleSidebarItems.push('Templates');
    if (canAccessIntegrations) visibleSidebarItems.push('Integrations');
    if (canAccessManageUsers) visibleSidebarItems.push('Manage Users');

    // Route access checker
    const canAccessRoute = (route: string): boolean => {
      // Normalize route
      const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

      // Route to permission mapping
      const routePermissions: Record<string, boolean> = {
        '/': canAccessDashboard,
        '/deals': canAccessDeals,
        '/notifications': true, // Everyone can access notifications
        '/knowledge-base': canAccessKnowledgeBase,
        '/templates': canAccessTemplates,
        '/integrations': canAccessIntegrations,
        '/users': canAccessManageUsers,
        '/generate-sow': canGenerateSOW,
      };

      // Check exact match first
      if (routePermissions[normalizedRoute] !== undefined) {
        return routePermissions[normalizedRoute];
      }

      // Check prefix matches for nested routes
      if (normalizedRoute.startsWith('/deals/')) {
        return canAccessDeals;
      }
      if (normalizedRoute.startsWith('/generate-sow/')) {
        return canGenerateSOW;
      }
      if (normalizedRoute.startsWith('/templates/')) {
        return canAccessTemplates;
      }

      // Default: allow access (for routes not explicitly restricted)
      return true;
    };

    return {
      // Role information
      role,
      isLeadership,
      isSA,
      isAE,

      // Feature access flags
      canAccessDashboard,
      canAccessDeals,
      canAccessKnowledgeBase,
      canAccessTemplates,
      canAccessIntegrations,
      canAccessManageUsers,
      canGenerateSOW,
      canAssignDeals,

      // Sidebar visibility
      visibleSidebarItems,

      // Route access check
      canAccessRoute,
    };
  }, [userGroups]);
}
