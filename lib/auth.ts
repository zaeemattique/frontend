/**
 * Authentication Service
 * Handles AWS Amplify authentication operations
 * Client-side only - uses browser storage
 */

import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
  updatePassword,
  confirmSignIn,
  resetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
} from 'aws-amplify/auth';
import type { User } from '@/types';

/**
 * Token cache to reduce Amplify API calls
 * Tokens are cached for 50 seconds (well under the 1 hour validity)
 */
class TokenCache {
  private cache: { token: string | null; timestamp: number } | null = null;
  private readonly TTL = 50000; // 50 seconds

  isValid(): boolean {
    if (!this.cache) return false;
    const age = Date.now() - this.cache.timestamp;
    return age < this.TTL;
  }

  set(token: string | null): void {
    this.cache = { token, timestamp: Date.now() };
  }

  get(): string | null {
    return this.cache?.token ?? null;
  }

  clear(): void {
    this.cache = null;
  }
}

const accessTokenCache = new TokenCache();

// Session timeout in milliseconds (configurable via env var, default 30 minutes)
const SESSION_TIMEOUT_MS = parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || '30', 10) * 60 * 1000;

// Track last activity time
let lastActivityTime: number = Date.now();

/**
 * Update last activity time - call this on user interactions
 */
export function updateLastActivity(): void {
  lastActivityTime = Date.now();
}

/**
 * Get time since last activity in milliseconds
 */
export function getTimeSinceLastActivity(): number {
  return Date.now() - lastActivityTime;
}

/**
 * Check if session has timed out due to inactivity
 */
export function isSessionTimedOut(): boolean {
  return getTimeSinceLastActivity() > SESSION_TIMEOUT_MS;
}

/**
 * Get session timeout duration in milliseconds
 */
export function getSessionTimeoutMs(): number {
  return SESSION_TIMEOUT_MS;
}

/**
 * Parse JWT payload without verification
 * Used to extract claims like cognito:groups
 */
function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return {};
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (_error) {
    console.error('[Auth] Error parsing JWT:', _error);
    return {};
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentAuthUser(): Promise<User | null> {
  try {
    const { userId, username } = await getCurrentUser();

    // Get user attributes from ID token
    const idToken = await getIdToken();
    let groups: string[] = [];
    let fullName: string = username;
    let email: string = username;

    if (idToken) {
      const payload = parseJwtPayload(idToken);
      console.log('[Auth] JWT payload claims:', Object.keys(payload));
      groups = (payload['cognito:groups'] as string[]) || [];
      // Get full name - try multiple claims in order of preference
      fullName = (payload['name'] as string)
        || (payload['given_name'] as string)
        || (payload['preferred_username'] as string)
        || (payload['cognito:username'] as string)
        || username;
      // Get email from 'email' claim, fallback to username
      email = (payload['email'] as string) || username;
      console.log('[Auth] Extracted user info - name:', fullName, 'email:', email);
    }

    return {
      id: userId,
      email: email,
      name: fullName,
      preferred_username: username,
      groups,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Sign in with username and password
 * Returns user object or challenge information
 */
export async function signIn(
  username: string,
  password: string
): Promise<
  | User
  | { challengeName: string; challengeParameters?: Record<string, unknown> }
> {
  try {
    const { isSignedIn, nextStep } = await amplifySignIn({ username, password });

    // Handle NEW_PASSWORD_REQUIRED challenge
    if (
      nextStep &&
      nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
    ) {
      return {
        challengeName: 'NEW_PASSWORD_REQUIRED',
        challengeParameters: {
          username,
          missingAttributes: nextStep.missingAttributes || {},
        },
      };
    }

    // Handle other challenges
    if (nextStep && nextStep.signInStep !== 'DONE') {
      throw new Error(`Unsupported authentication step: ${nextStep.signInStep}`);
    }

    if (!isSignedIn) {
      throw new Error('Sign in failed');
    }

    // Get user info after successful sign in
    const user = await getCurrentAuthUser();
    if (!user) {
      throw new Error('Failed to get user info after sign in');
    }

    return user;
  } catch (error) {
    console.error('[Auth] Sign in error:', error);
    throw error;
  }
}

/**
 * Confirm new password for NEW_PASSWORD_REQUIRED challenge
 */
export async function confirmNewPassword(
  newPassword: string,
  _username: string
): Promise<User> {
  try {
    const { isSignedIn } = await confirmSignIn({
      challengeResponse: newPassword,
    });

    if (!isSignedIn) {
      throw new Error('Failed to confirm new password - not signed in');
    }

    const user = await getCurrentAuthUser();
    if (!user) {
      throw new Error('Failed to get user info after password confirmation');
    }

    return user;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    // Provide user-friendly error messages
    if (err.name === 'InvalidPasswordException') {
      throw new Error('Password does not meet requirements');
    } else if (err.name === 'InvalidParameterException') {
      throw new Error('Invalid password format');
    } else if (err.name === 'NotAuthorizedException') {
      throw new Error('Not authorized to change password');
    } else {
      throw new Error(err.message || 'Failed to confirm new password');
    }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  console.log('[Auth] Signing out and clearing token cache');
  accessTokenCache.clear();
  await amplifySignOut();
}

/**
 * Get ID token (contains user claims like groups)
 */
export async function getIdToken(): Promise<string | null> {
  try {
    const { tokens } = await fetchAuthSession();
    return tokens?.idToken?.toString() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get access token (used for API authorization)
 * Implements caching to reduce Amplify API calls
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // Return cached token if valid
    if (accessTokenCache.isValid()) {
      const cached = accessTokenCache.get();
      if (cached) {
        console.log('[Auth] Using cached access token');
        return cached;
      }
    }

    // Fetch fresh token
    console.log('[Auth] Fetching fresh access token');
    const { tokens } = await fetchAuthSession();
    const token = tokens?.accessToken?.toString() || null;

    // Cache the token
    accessTokenCache.set(token);

    return token;
  } catch (error) {
    console.error('[Auth] Error getting access token:', error);
    accessTokenCache.clear();
    return null;
  }
}

/**
 * Refresh access token (force fetch new token)
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    console.log('[Auth] Force refreshing access token');
    const { tokens } = await fetchAuthSession({ forceRefresh: true });
    const token = tokens?.accessToken?.toString() || null;

    // Update cache
    accessTokenCache.set(token);

    return token;
  } catch (error) {
    console.error('[Auth] Error refreshing access token:', error);
    accessTokenCache.clear();
    return null;
  }
}

/**
 * Refresh ID token (force fetch new token)
 * Used for API authentication - matches original frontend
 */
export async function refreshIdToken(): Promise<string | null> {
  try {
    console.log('[Auth] Force refreshing ID token');
    const { tokens } = await fetchAuthSession({ forceRefresh: true });
    const token = tokens?.idToken?.toString() || null;

    if (token) {
      console.log('[Auth] ID token refreshed successfully');
    }

    return token;
  } catch (error) {
    console.error('[Auth] Error refreshing ID token:', error);
    return null;
  }
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  try {
    await updatePassword({ oldPassword, newPassword });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    // Provide user-friendly error messages
    if (err.name === 'NotAuthorizedException') {
      throw new Error('Current password is incorrect');
    } else if (err.name === 'InvalidPasswordException') {
      throw new Error('New password does not meet requirements');
    } else if (err.name === 'LimitExceededException') {
      throw new Error('Too many password change attempts. Please try again later');
    } else {
      throw new Error(err.message || 'Failed to change password');
    }
  }
}

/**
 * Initiate forgot password flow
 * Sends a verification code to the user's email
 */
export async function forgotPassword(
  username: string
): Promise<{ codeDeliveryDetails: { destination?: string; deliveryMedium?: string } }> {
  try {
    const result = await resetPassword({ username });

    return {
      codeDeliveryDetails: {
        destination: result.nextStep.codeDeliveryDetails?.destination,
        deliveryMedium: result.nextStep.codeDeliveryDetails?.deliveryMedium,
      },
    };
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    // Provide user-friendly error messages
    if (err.name === 'UserNotFoundException') {
      throw new Error('No account found with this email address');
    } else if (err.name === 'LimitExceededException') {
      throw new Error('Too many attempts. Please try again later');
    } else if (err.name === 'InvalidParameterException') {
      throw new Error('Please enter a valid email address');
    } else {
      throw new Error(err.message || 'Failed to send reset code');
    }
  }
}

/**
 * Confirm forgot password with verification code and new password
 */
export async function confirmForgotPassword(
  username: string,
  confirmationCode: string,
  newPassword: string
): Promise<void> {
  try {
    await amplifyConfirmResetPassword({
      username,
      confirmationCode,
      newPassword,
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };

    // Provide user-friendly error messages
    if (err.name === 'CodeMismatchException') {
      throw new Error('Invalid verification code. Please check and try again');
    } else if (err.name === 'ExpiredCodeException') {
      throw new Error('Verification code has expired. Please request a new one');
    } else if (err.name === 'InvalidPasswordException') {
      throw new Error('Password does not meet requirements');
    } else if (err.name === 'LimitExceededException') {
      throw new Error('Too many attempts. Please try again later');
    } else if (err.name === 'UserNotFoundException') {
      throw new Error('No account found with this email address');
    } else {
      throw new Error(err.message || 'Failed to reset password');
    }
  }
}
