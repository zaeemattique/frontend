/**
 * New Password Form Component
 *
 * Handles NEW_PASSWORD_REQUIRED challenge from Cognito
 * Includes password validation and strength indicators
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewPasswordFormProps {
  username: string;
  onPasswordSet: () => void;
  onError: (error: string) => void;
}

export function NewPasswordForm({
  username,
  onPasswordSet,
  onError,
}: NewPasswordFormProps) {
  const { confirmNewPassword, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  /**
   * Validate password against Cognito requirements
   * Note: require_symbols is false in Cognito config
   */
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Must contain at least one number');
    }

    // Note: Special characters are optional (require_symbols = false in Cognito)

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(''); // Clear previous errors

    // Validation
    if (!formData.newPassword || !formData.confirmPassword) {
      onError('Please fill in all fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      onError('Passwords do not match');
      return;
    }

    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      onError(`Password requirements not met: ${passwordErrors.join(', ')}`);
      return;
    }

    const result = await confirmNewPassword(formData.newPassword, username);

    if (result.success) {
      onPasswordSet();
    } else {
      onError(result.error || 'Failed to set new password');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const passwordErrors = formData.newPassword
    ? validatePassword(formData.newPassword)
    : [];
  const passwordsMatch =
    formData.newPassword &&
    formData.confirmPassword &&
    formData.newPassword === formData.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set Your New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please set a new password to complete your account setup
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-6 shadow rounded-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="form-label">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                  inputClassName="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPasswords.new ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password validation feedback */}
              {formData.newPassword && passwordErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordErrors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600">
                      • {error}
                    </p>
                  ))}
                </div>
              )}

              {formData.newPassword && passwordErrors.length === 0 && (
                <p className="mt-2 text-xs text-green-600">
                  ✓ Password meets all requirements
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange('confirmPassword', e.target.value)
                  }
                  disabled={isLoading}
                  required
                  autoComplete="new-password"
                  inputClassName="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Toggle password visibility"
                >
                  {showPasswords.confirm ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password match feedback */}
              {formData.confirmPassword && (
                <p
                  className={cn(
                    'mt-2 text-xs',
                    passwordsMatch ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {passwordsMatch
                    ? '✓ Passwords match'
                    : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || passwordErrors.length > 0 || !passwordsMatch}
              className="w-full py-3 justify-center"
            >
              {isLoading ? (
                <>
                  <div className="spinner mr-2" />
                  Setting Password...
                </>
              ) : (
                'Set New Password'
              )}
            </Button>
          </form>

          {/* Password Requirements */}
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Password Requirements:
            </h4>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>At least 8 characters long</li>
              <li>At least one lowercase letter (a-z)</li>
              <li>At least one uppercase letter (A-Z)</li>
              <li>At least one number (0-9)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
