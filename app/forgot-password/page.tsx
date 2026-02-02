/**
 * Forgot Password Page
 *
 * Handles the password reset flow:
 * 1. User enters email to receive verification code
 * 2. User enters code and new password to complete reset
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type Step = 'email' | 'code' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, confirmForgotPassword } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [codeDestination, setCodeDestination] = useState('');

  /**
   * Validate password against Cognito requirements
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

    return errors;
  };

  /**
   * Handle email submission - sends verification code
   */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        setCodeDestination(result.codeDeliveryDetails?.destination || email);
        setStep('code');
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Handle code and new password submission
   */
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError(`Password requirements not met: ${passwordErrors.join(', ')}`);
      return;
    }

    setSubmitting(true);

    try {
      const result = await confirmForgotPassword(email, code, newPassword);

      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Resend verification code
   */
  const handleResendCode = async () => {
    setError('');
    setSubmitting(true);

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        setCodeDestination(result.codeDeliveryDetails?.destination || email);
        setError(''); // Clear any previous error
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field: 'new' | 'confirm') => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const passwordErrors = newPassword ? validatePassword(newPassword) : [];
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  // Success step
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Password Reset Successful</h1>
          <p className="text-gray-600 mb-8">
            Your password has been reset successfully. You can now log in with your new password.
          </p>

          <Button
            onClick={() => router.push('/login')}
            variant="primary"
            className="w-full py-3 justify-center"
          >
            Go to Login
          </Button>
        </div>
      </div>
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

        {/* Back to Login */}
        <button
          onClick={() => router.push('/login')}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Login
        </button>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {step === 'email' ? 'Forgot Password?' : 'Reset Your Password'}
        </h1>
        <p className="text-gray-600 mb-6">
          {step === 'email'
            ? "Enter your email address and we'll send you a verification code."
            : `Enter the verification code sent to ${codeDestination}`}
        </p>

        {/* Error Message */}
        {error && <div className="error-message mb-6">{error}</div>}

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                autoComplete="email"
                inputClassName="pl-10"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full py-3 justify-center"
            >
              {submitting ? (
                <>
                  <div className="spinner mr-2" />
                  Sending...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>
        )}

        {/* Step 2: Code and New Password */}
        {step === 'code' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* Verification Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <Input
                id="code"
                name="code"
                type="text"
                required
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={submitting}
                autoComplete="one-time-code"
              />
              <button
                type="button"
                onClick={handleResendCode}
                disabled={submitting}
                className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
              >
                Didn&apos;t receive the code? Resend
              </button>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                  inputClassName="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>

              {/* Password validation feedback */}
              {newPassword && passwordErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {passwordErrors.map((err, index) => (
                    <p key={index} className="text-xs text-red-600">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {newPassword && passwordErrors.length === 0 && (
                <p className="mt-2 text-xs text-green-600">Password meets all requirements</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                  inputClassName="pr-10"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Password match feedback */}
              {confirmPassword && (
                <p className={cn('mt-2 text-xs', passwordsMatch ? 'text-green-600' : 'text-red-600')}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting || passwordErrors.length > 0 || !passwordsMatch}
              className="w-full py-3 justify-center"
            >
              {submitting ? (
                <>
                  <div className="spinner mr-2" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>

            {/* Password Requirements */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>At least one lowercase letter (a-z)</li>
                <li>At least one uppercase letter (A-Z)</li>
                <li>At least one number (0-9)</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
