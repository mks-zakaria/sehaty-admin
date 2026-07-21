import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Lifts the card on hover — for clickable / actionable cards. */
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-line bg-surface-card p-5 shadow-card',
        'transition-shadow duration-200',
        interactive && 'hover:shadow-raised',
        className,
      )}
      {...props}
    />
  );
}
