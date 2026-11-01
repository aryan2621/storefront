import React, { useId } from 'react';
import { cn } from '@/lib/utils';

/** Circular cancellation mark with optional wavy cancel lines. Decorative unless given a label. */
export const Postmark: React.FC<{
  top?: string;
  middle?: string;
  bottom?: string;
  waves?: boolean;
  className?: string;
  label?: string;
}> = ({ top = 'STOREFRONT', middle = 'INR', bottom = 'OFFLINE KEYS', waves = false, className, label }) => {
  const id = useId();
  return (
    <svg
      viewBox={waves ? '0 0 260 120' : '0 0 120 120'}
      className={cn('text-[var(--color-postmark)]', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      fill="none"
      stroke="currentColor"
    >
      <defs>
        <path id={`${id}-t`} d="M 20 60 A 40 40 0 0 1 100 60" />
        <path id={`${id}-b`} d="M 16 60 A 44 44 0 0 0 104 60" />
      </defs>
      <circle cx="60" cy="60" r="56" strokeWidth="3" />
      <circle cx="60" cy="60" r="34" strokeWidth="1.5" />
      <text fill="currentColor" stroke="none" fontFamily="Martian Mono, monospace" fontSize="10.5" fontWeight="600" letterSpacing="1.5">
        <textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">
          {top}
        </textPath>
      </text>
      <text fill="currentColor" stroke="none" fontFamily="Martian Mono, monospace" fontSize="9" fontWeight="600" letterSpacing="1.2">
        <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">
          {bottom}
        </textPath>
      </text>
      <text
        x="60"
        y="65"
        fill="currentColor"
        stroke="none"
        fontFamily="Martian Mono, monospace"
        fontSize="14"
        fontWeight="600"
        textAnchor="middle"
      >
        {middle}
      </text>
      {waves &&
        [44, 60, 76].map((y) => (
          <path key={y} d={`M 124 ${y} q 11 -8 22 0 t 22 0 t 22 0 t 22 0 t 22 0 t 22 0`} strokeWidth="3" strokeLinecap="round" />
        ))}
    </svg>
  );
};
