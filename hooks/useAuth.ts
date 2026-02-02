/**
 * useAuth Hook
 *
 * Custom hook for authentication state and operations
 * Integrates Redux auth slice with AWS Amplify
 */

'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setUser,
  setIsAuthenticated,
  setAuthChallenge,
  logout as logoutAction,
  selectUser,
  selectIsAuthenticated,
  selectAuthChallenge,
  selectUserGroups,
} from '@/store/slices/authSlice';
import {
  getCurrentAuthUser,
  signIn as authSignIn,
  confirmNewPassword as authConfirmNewPassword,
  signOut as authSignOut,
  changePassword as authChangePassword,
  forgotPassword as authForgotPassword,
  confirmForgotPassword as authConfirmForgotPassword,
} from '@/lib/auth';
import { configureAmplify, isAmplifyConfigured } from '@/config/amplify';
import { resetApiState } from '@/store/services/api';
import type { User as _User } from '@/types';

/**
 * Authentication hook with Redux integration
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authChallenge = useAppSelector(selectAuthChallenge);
  const userGroups = useAppSelector(selectUserGroups);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Amplify and check auth status on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Configure Amplify (client-side only)
        configureAmplify();

        // Check if user is already authenticated
        const currentUser = await getCurrentAuthUser();

        if (mounted) {
          if (currentUser) {
            dispatch(setUser(currentUser));
            dispatch(setIsAuthenticated(true));
          } else {
            dispatch(setUser(null));
            dispatch(setIsAuthenticated(false));
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[useAuth] Initialization error:', error);
        if (mounted) {
          dispatch(setUser(null));
          dispatch(setIsAuthenticated(false));
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [dispatch]);

  /**
   * Sign in with username and password
   */
  const signIn = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; challenge?: string; error?: string }> => {
    setError(null);
    setIsLoading(true);

    try {
      // Ensure Amplify is configured before attempting sign in
      if (!isAmplifyConfigured()) {
        console.log('[useAuth] Amplify not configured, configuring now...');
        configureAmplify();
      }

      const result = await authSignIn(username, password);

      // Check if it's a challenge response
      if ('challengeName' in result) {
        const challengeName = result.challengeName as string;
        dispatch(setAuthChallenge(challengeName));
        setIsLoading(false);
        return { success: true, challenge: challengeName };
      }

      // Successful sign in
      dispatch(setUser(result));
      dispatch(setIsAuthenticated(true));
      dispatch(setAuthChallenge(null));
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Confirm new password (for NEW_PASSWORD_REQUIRED challenge)
   */
  const confirmNewPassword = async (
    newPassword: string,
    username: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setIsLoading(true);

    try {
      // Ensure Amplify is configured
      if (!isAmplifyConfigured()) {
        console.log('[useAuth] Amplify not configured, configuring now...');
        configureAmplify();
      }

      const user = await authConfirmNewPassword(newPassword, username);

      dispatch(setUser(user));
      dispatch(setIsAuthenticated(true));
      dispatch(setAuthChallenge(null));
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Password confirmation failed';
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Sign out current user
   */
  const signOut = async (): Promise<void> => {
    setIsLoading(true);

    try {
      await authSignOut();
      // Clear auth state
      dispatch(logoutAction());
      // Reset all RTK Query caches to prevent data leakage between users
      dispatch(resetApiState());
    } catch (err) {
      console.error('[useAuth] Sign out error:', err);
      // Still clear Redux state even if Amplify signOut fails
      dispatch(logoutAction());
      dispatch(resetApiState());
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Change password for authenticated user
   */
  const changePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    try {
      await authChangePassword(oldPassword, newPassword);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Refresh user data from Cognito
   */
  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await getCurrentAuthUser();
      if (currentUser) {
        dispatch(setUser(currentUser));
      }
    } catch (err) {
      console.error('[useAuth] Refresh user error:', err);
    }
  };

  /**
   * Initiate forgot password flow
   */
  const forgotPassword = async (
    username: string
  ): Promise<{
    success: boolean;
    codeDeliveryDetails?: { destination?: string; deliveryMedium?: string };
    error?: string;
  }> => {
    setError(null);

    try {
      // Ensure Amplify is configured
      if (!isAmplifyConfigured()) {
        console.log('[useAuth] Amplify not configured, configuring now...');
        configureAmplify();
      }

      const result = await authForgotPassword(username);
      return { success: true, codeDeliveryDetails: result.codeDeliveryDetails };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send reset code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * Confirm forgot password with code and new password
   */
  const confirmForgotPassword = async (
    username: string,
    code: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);

    try {
      // Ensure Amplify is configured
      if (!isAmplifyConfigured()) {
        console.log('[useAuth] Amplify not configured, configuring now...');
        configureAmplify();
      }

      await authConfirmForgotPassword(username, code, newPassword);
      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    authChallenge,
    userGroups,

    // Actions
    signIn,
    confirmNewPassword,
    signOut,
    changePassword,
    refreshUser,
    forgotPassword,
    confirmForgotPassword,

    // Helpers
    hasGroup: (groupName: string) => userGroups.includes(groupName),
  };
}
