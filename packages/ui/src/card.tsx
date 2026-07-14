import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-brand/10 bg-white p-5 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}
