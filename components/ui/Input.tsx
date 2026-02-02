/**
 * Input Component
 *
 * Reusable input field with optional icon support
 */

'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  icon?: ReactNode;
  className?: string;
  inputClassName?: string;
}

export function Input({
  icon,
  className = '',
  inputClassName = '',
  ...props
}: InputProps) {
  const hasIcon = !!icon;

  // Base Tailwind classes matching form-input
  const baseClasses = 'block w-full rounded-md border border-neutral-200 px-3 py-2 text-sm text-black shadow-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 h-12';

  if (hasIcon) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none">
          {icon}
        </div>
        <input
          {...props}
          className={`${baseClasses} pl-10 ${inputClassName}`}
        />
      </div>
    );
  }

  return (
    <input
      {...props}
      className={`${baseClasses} ${inputClassName} ${className}`}
    />
  );
}
