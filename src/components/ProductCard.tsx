import React from 'react';
import { Product } from '../lib/api';
import { formatINR } from '../lib/format';
import { cn } from '@/lib/utils';

const appIcon = (id: string) => `/apps/${id}/icon.webp`;

export const priceSuffix = (p: Product) =>
  p.kind === 'subscription' ? (p.period === 'year' ? '/yr' : '/mo') : '';

/** The app's icon as the picture, printed name and denomination below, cut with perforations. */
export const StampFace: React.FC<{ product: Product; size?: 'sm' | 'lg' }> = ({ product, size = 'sm' }) => (
  <span className={cn('perforated block bg-[var(--color-stamp-paper)] text-[var(--color-stamp-ink)]', size === 'lg' && '[--perf:14px]')}>
    <span className="block overflow-hidden bg-[var(--color-stamp)]">
      <img
        src={product.image_url || appIcon(product.id)}
        alt=""
        width={256}
        height={256}
        loading="lazy"
        className="block aspect-square w-full scale-[1.5]" /* the icon is a rounded tile; zoom so only its mark shows */
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
      />
    </span>
    <span className={cn('block px-0.5 pt-1.5 leading-tight', size === 'lg' ? 'pb-1' : 'pb-0.5')}>
      <span className={cn('block font-extrabold [overflow-wrap:anywhere]', size === 'lg' ? 'text-2xl' : 'line-clamp-2 text-[0.9375rem]')}>
        {product.name}
      </span>
      <span className={cn('mt-0.5 flex items-baseline gap-1.5', size === 'lg' && 'mt-1')}>
        <span className={cn('font-mono-price font-semibold', size === 'lg' ? 'text-xl' : 'text-sm')}>
          {formatINR(product.price_paise)}
          {priceSuffix(product)}
        </span>
        {product.kind !== 'subscription' && (
          <span className="font-mono text-[0.6875rem] text-[var(--color-stamp-ink-muted)]">once</span>
        )}
      </span>
    </span>
  </span>
);
