import * as React from 'react';
import { cn } from '@/lib/utils';

const tones = {
  neutral: 'border-[var(--color-border-strong)] text-[var(--color-muted)]',
  success: 'border-[var(--color-success)] text-[var(--color-success)]',
  warning: 'border-[var(--color-warning)] text-[var(--color-warning)]',
  danger: 'border-[var(--color-danger)] text-[var(--color-danger)]',
} as const;

export type BadgeTone = keyof typeof tones;

const statusTone: Record<string, BadgeTone> = {
  captured: 'success',
  paid: 'success',
  active: 'success',
  authenticated: 'success',
  pending: 'warning',
  created: 'warning',
  partially_refunded: 'warning',
  disputed: 'danger',
  failed: 'danger',
  halted: 'danger',
  revoked: 'danger',
  refunded: 'danger',
};

export function Badge({
  tone,
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  const t = tone ?? statusTone[String(children)] ?? 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] border px-1.5 py-0.5 font-mono text-[0.75rem] font-medium',
        tones[t],
        className
      )}
    >
      {String(children).replace(/_/g, ' ')}
    </span>
  );
}
