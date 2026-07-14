import clsx from 'clsx';

export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={clsx(
        'inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand',
        className,
      )}
    />
  );
}
