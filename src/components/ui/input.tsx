import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-3 text-base text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus-visible:border-[var(--color-foreground)] focus-visible:outline-none aria-[invalid=true]:border-[var(--color-danger)]',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';
