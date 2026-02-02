/**
 * Protected Route Layout
 *
 * Matches original frontend Layout structure
 * Wraps all authenticated routes with Header and Sidebar
 * Enforces role-based access control for routes
 * Includes automatic token expiry handling via Cognito/Amplify
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useTokenExpiry } from '@/hooks/useTokenExpiry';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { EllipseGlow } from '@/components/ui/EllipseGlow';
import { DealsSearchProvider } from '@/contexts/DealsSearchContext';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { canAccessRoute } = usePermissions();

  // Handle session expiry (token refresh failed or user signed out)
  const handleSessionExpired = useCallback(async () => {
    console.log('[ProtectedLayout] Session expired - logging out');
    await signOut();
    router.push('/login?reason=session_expired');
  }, [signOut, router]);

  // Monitor Cognito token expiry via Amplify Hub events
  // Automatically handles token refresh failures and session revocation
  useTokenExpiry({
    onSessionExpired: handleSessionExpired,
    enabled: isAuthenticated && !isLoading,
  });

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check role-based route access
  useEffect(() => {
    if (!isLoading && isAuthenticated && !canAccessRoute(pathname)) {
      // Redirect to dashboard if user doesn't have access to this route
      router.push('/');
    }
  }, [isLoading, isAuthenticated, pathname, canAccessRoute, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <DealsSearchProvider>
      <div className="layout relative">
        {/* Background Ellipse Glow Effect */}
        <EllipseGlow />

        <div className="main-content relative z-10">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <Header />
            <main className="flex-1 overflow-auto min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </DealsSearchProvider>
  );
}
