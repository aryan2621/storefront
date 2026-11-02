import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Download } from 'lucide-react';
import { fetchProduct } from '../lib/api';
import { formatINR } from '../lib/format';
import { BuyDialog } from '../components/BuyDialog';
import { useRequireSignIn } from '../lib/session';
import { StampFace, priceSuffix } from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ProductSections } from '../components/ProductSections';
import { productContent } from '../content';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [buyOpen, setBuyOpen] = useState(false);
  const requireSignIn = useRequireSignIn();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProduct(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[16rem_1fr]" role="status">
        <div className="perforated aspect-[4/5] w-48 bg-[var(--color-surface-2)] motion-safe:animate-pulse md:w-full" />
        <div className="space-y-4">
          <div className="h-12 w-2/3 bg-[var(--color-surface-2)] motion-safe:animate-pulse" />
          <div className="h-5 w-full bg-[var(--color-surface-2)] motion-safe:animate-pulse" />
        </div>
        <span className="sr-only">Loading app</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold">No app by that name</h1>
        <p className="mt-2 text-[var(--color-muted)]">That product may no longer be active. Use the product landing page to continue.</p>
        <Button className="mt-6" variant="outline" asChild>
          <Link to="/">Back to storefront</Link>
        </Button>
      </div>
    );
  }

  const isSubscription = product.kind === 'subscription';
  const comingSoon = !!product.coming_soon;
  const terms = isSubscription
    ? `Billed every ${product.period || 'month'} · cancel anytime`
    : `One-time · ${product.updates_months || 12} months of updates`;

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pb-14 pt-4 sm:px-6 sm:pt-8">
        <Link
          to="/"
          className="inline-flex h-11 items-center gap-2 text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to storefront
        </Link>

        <header className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-[16rem_1fr] md:gap-12">
          <div className="w-44 -rotate-2 drop-shadow-[0_14px_14px_rgb(0_0_0/0.22)] md:w-full">
            <StampFace product={product} size="lg" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[clamp(2.5rem,7vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">{product.name}</h1>
            {comingSoon && <Badge tone="warning" className="mt-3">coming soon</Badge>}
            <p className="mt-3 text-xl leading-snug">{product.tagline}</p>
            <p className="mt-4 max-w-prose leading-relaxed text-[var(--color-muted)]">{product.description_md}</p>

            <div className="mt-8 border-t-2 border-[var(--color-foreground)] pt-4">
              <p className="font-mono-price text-4xl font-semibold">
                {formatINR(product.price_paise)}
                {priceSuffix(product)}
              </p>
              <p className="mt-1 text-[var(--color-muted)]">{terms}</p>
              <div className="mt-5 hidden flex-wrap gap-3 md:flex">
                <Button size="lg" disabled={comingSoon} onClick={() => requireSignIn(() => setBuyOpen(true))}>
                  {comingSoon ? 'Coming soon' : `Buy ${product.name} Pro`}
                </Button>
                {product.download_url && (
                  <Button size="lg" variant="outline" asChild>
                    <a href={product.download_url} target="_blank" rel="noreferrer">
                      <Download className="h-4 w-4" aria-hidden />
                      Free build
                    </a>
                  </Button>
                )}
              </div>
              {product.download_url && (
                <a
                  href={product.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex h-11 items-center gap-1.5 underline md:hidden"
                >
                  <Download className="h-4 w-4" aria-hidden /> Download the free build
                </a>
              )}
              {product.landing_url && (
                <a href={product.landing_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-11 items-center gap-1.5 underline">
                  Full product details <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              )}
            </div>
          </div>
        </header>
      </div>

      <ProductSections product={product} content={productContent[product.id]} />

      <div className="slide-up sticky bottom-0 z-30 border-t border-[var(--color-border-strong)] bg-[var(--color-surface-1)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1">
            <span className="block font-mono-price text-xl font-semibold">
              {formatINR(product.price_paise)}
              {priceSuffix(product)}
            </span>
            <span className="block truncate text-sm text-[var(--color-muted)]">{terms}</span>
          </p>
          <Button size="lg" disabled={comingSoon} onClick={() => requireSignIn(() => setBuyOpen(true))}>
            {comingSoon ? 'Coming soon' : 'Buy Pro'}
          </Button>
        </div>
      </div>

      <BuyDialog product={product} open={buyOpen} onOpenChange={setBuyOpen} />
    </>
  );
};
