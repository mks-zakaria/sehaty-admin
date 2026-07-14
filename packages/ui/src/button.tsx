import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-brand-on hover:bg-brand-hover focus-visible:ring-brand disabled:bg-brand/50',
  secondary:
    'bg-surface-card text-brand border border-line hover:bg-brand/10 focus-visible:ring-brand',
  ghost:
    'bg-transparent text-content hover:bg-brand/10 focus-visible:ring-brand',
};

export function Button({
  variant = 'primary',
  className,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card',
        'disabled:cursor-not-allowed disabled:opacity-70',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}
