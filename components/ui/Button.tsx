/**
 * Button Component
 *
 * Reusable button with primary, secondary, and tertiary variants
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2';

  const variantClasses = {
    primary: 'bg-violet-950 text-white disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
    tertiary: 'bg-violet-50 text-violet-950 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
