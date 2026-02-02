/**
 * Change Password Page
 *
 * Allow authenticated users to change their password
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { changePassword } = useAuth();

  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    if (!password) return null;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength < 3) return { level: 'weak', color: 'red' };
    if (strength < 5) return { level: 'medium', color: 'yellow' };
    return { level: 'strong', color: 'green' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!formData.oldPassword) {
      setError('Current password is required');
      return;
    }

    if (!formData.newPassword) {
      setError('New password is required');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (!/[A-Z]/.test(formData.newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(formData.newPassword)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(formData.newPassword)) {
      setError('Password must contain at least one number');
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(formData.newPassword)) {
      setError('Password must contain at least one special character');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.oldPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(formData.oldPassword, formData.newPassword);
      setSuccess(true);
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to change password');
      } else {
        setError('Failed to change password. Please check your current password and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="card">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
          <p className="mt-2 text-sm text-gray-600">
            Update your account password
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              Password changed successfully! Redirecting to dashboard...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password *
            </label>
            <input
              type="password"
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              required
              disabled={isLoading || success}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your current password"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password *
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              required
              disabled={isLoading || success}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your new password"
            />

            {/* Password Strength Indicator */}
            {formData.newPassword && passwordStrength && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">
                    Password Strength:
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      passwordStrength.color === 'red' && 'text-red-600',
                      passwordStrength.color === 'yellow' && 'text-yellow-600',
                      passwordStrength.color === 'green' && 'text-green-600'
                    )}
                  >
                    {passwordStrength.level.toUpperCase()}
                  </span>
                </div>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      passwordStrength.color === 'red' && 'bg-red-500 w-1/3',
                      passwordStrength.color === 'yellow' &&
                        'bg-yellow-500 w-2/3',
                      passwordStrength.color === 'green' && 'bg-green-500 w-full'
                    )}
                  />
                </div>
              </div>
            )}

            {/* Password Requirements */}
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-xs font-medium text-gray-700 mb-2">
                Password must contain:
              </p>
              <ul className="space-y-1 text-xs text-gray-600">
                <li
                  className={cn(
                    'flex items-center',
                    formData.newPassword.length >= 8 && 'text-green-600'
                  )}
                >
                  <span className="mr-2">
                    {formData.newPassword.length >= 8 ? '✓' : '○'}
                  </span>
                  At least 8 characters
                </li>
                <li
                  className={cn(
                    'flex items-center',
                    /[A-Z]/.test(formData.newPassword) && 'text-green-600'
                  )}
                >
                  <span className="mr-2">
                    {/[A-Z]/.test(formData.newPassword) ? '✓' : '○'}
                  </span>
                  One uppercase letter
                </li>
                <li
                  className={cn(
                    'flex items-center',
                    /[a-z]/.test(formData.newPassword) && 'text-green-600'
                  )}
                >
                  <span className="mr-2">
                    {/[a-z]/.test(formData.newPassword) ? '✓' : '○'}
                  </span>
                  One lowercase letter
                </li>
                <li
                  className={cn(
                    'flex items-center',
                    /[0-9]/.test(formData.newPassword) && 'text-green-600'
                  )}
                >
                  <span className="mr-2">
                    {/[0-9]/.test(formData.newPassword) ? '✓' : '○'}
                  </span>
                  One number
                </li>
                <li
                  className={cn(
                    'flex items-center',
                    /[^a-zA-Z0-9]/.test(formData.newPassword) &&
                      'text-green-600'
                  )}
                >
                  <span className="mr-2">
                    {/[^a-zA-Z0-9]/.test(formData.newPassword) ? '✓' : '○'}
                  </span>
                  One special character
                </li>
              </ul>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={isLoading || success}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm your new password"
            />
            {formData.confirmPassword &&
              formData.newPassword !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  Passwords do not match
                </p>
              )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/')}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                success ||
                !formData.oldPassword ||
                !formData.newPassword ||
                !formData.confirmPassword ||
                formData.newPassword !== formData.confirmPassword
              }
              className={cn(
                'btn btn-primary',
                (isLoading || success) && 'opacity-50'
              )}
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-2" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
