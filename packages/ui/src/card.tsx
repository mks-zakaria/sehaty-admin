import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-line bg-surface-card p-5 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
