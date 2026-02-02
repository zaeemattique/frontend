/**
 * Login Page
 *
 * Public page for user authentication
 * Handles login and NEW_PASSWORD_REQUIRED challenge
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NewPasswordForm } from '@/components/auth/NewPasswordForm';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated, isLoading, authChallenge } = useAuth();

  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check for session expired reason in URL
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session_expired') {
      setSessionExpiredMessage('Your session has expired due to inactivity. Please log in again.');
      // Clear the URL parameter
      router.replace('/login');
    }
  }, [searchParams, router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await signIn(credentials.username, credentials.password);

      if (!result.success && !result.challenge) {
        setError(result.error || 'Login failed');
      }
      // If challenge is present, NewPasswordForm will be shown
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSet = () => {
    // User will be automatically logged in after setting password
    // The useAuth hook handles the redirect
  };

  const handleNewPasswordError = (error: string) => {
    setError(error);
  };

  // Show loading state while checking auth
  if (isLoading && !authChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="spinner" />
      </div>
    );
  }

  // Show new password form if there's a NEW_PASSWORD_REQUIRED challenge
  if (authChallenge === 'NEW_PASSWORD_REQUIRED') {
    return (
      <NewPasswordForm
        username={credentials.username}
        onPasswordSet={handlePasswordSet}
        onError={handleNewPasswordError}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/Cloudelligent-logo.png"
            alt="Cloudelligent"
            width={200}
            height={50}
            className="h-auto"
          />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          SOW Generator
        </h1>

        {/* Subtitle */}
        <p className="text-center text-gray-600 mb-8">
          Don&apos;t have an account yet?{' '}
          <a href="/signup" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Sign up now
          </a>
        </p>

        {/* Session Expired Message */}
        {sessionExpiredMessage && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            {sessionExpiredMessage}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-message mb-6">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <Input
              id="username"
              name="username"
              type="text"
              required
              placeholder="Email"
              value={credentials.username}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="username"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              disabled={submitting}
              autoComplete="current-password"
              inputClassName="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-600">Remember me</span>
            </label>
            <a href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700">
              Forgot Password ?
            </a>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {submitting ? (
              <>
                <div className="spinner mr-2" />
                Signing in...
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
