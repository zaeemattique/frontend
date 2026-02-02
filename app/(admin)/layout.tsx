/**
 * Admin Route Layout
 *
 * Wraps all admin-only routes
 * Checks for admin privileges in addition to authentication
 * Includes automatic token expiry handling via Cognito/Amplify
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useTokenExpiry } from '@/hooks/useTokenExpiry';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  // Handle session expiry (token refresh failed or user signed out)
  const handleSessionExpired = useCallback(async () => {
    console.log('[AdminLayout] Session expired - logging out');
    await signOut();
    router.push('/login?reason=session_expired');
  }, [signOut, router]);

  // Monitor Cognito token expiry via Amplify Hub events
  useTokenExpiry({
    onSessionExpired: handleSessionExpired,
    enabled: isAuthenticated && !isLoading,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && isAuthenticated && !isAdmin) {
      // Redirect non-admin users to dashboard
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  // Don't render if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="container mx-auto px-4 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
