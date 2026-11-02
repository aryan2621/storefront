import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicProducts, type Product } from '../lib/api';
import { formatINR } from '../lib/format';
import { BuyDialog } from '../components/BuyDialog';
import { StampFace, priceSuffix } from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { useRequireSignIn } from '../lib/session';

export const Products: React.FC = () => {
  const [buying, setBuying] = useState<Product | null>(null);
  const requireSignIn = useRequireSignIn();
  const { data: products = [], isLoading, error } = useQuery({ queryKey: ['public-products'], queryFn: fetchPublicProducts });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
      <h1 className="text-[clamp(2rem,7vw,3.5rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">Products</h1>
      <p className="mt-3 max-w-2xl text-[var(--color-muted)]">
        Every app has a free build. A Pro licence is a signed key for one app. Pay in rupees; the key is shown on screen, emailed and kept on your account.
      </p>

      {isLoading && <p className="mt-10 text-[var(--color-muted)]" role="status">Loading products…</p>}
      {error && <p className="mt-10 text-[var(--color-muted)]">Could not load products. Try again shortly.</p>}

      <ul className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li key={p.id} className="flex flex-col">
            <Link to={`/p/${p.id}`} className="block w-40 -rotate-1" aria-label={`${p.name} details`}>
              <StampFace product={p} />
            </Link>
            <p className="mt-4 leading-snug">{p.tagline}</p>
            <p className="mt-2 font-mono-price text-xl font-semibold">
              {formatINR(p.price_paise)}
              {priceSuffix(p)}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => requireSignIn(() => setBuying(p))}>Buy Now</Button>
              <Button variant="outline" asChild>
                <Link to={`/p/${p.id}`}>Details</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {buying && <BuyDialog product={buying} open onOpenChange={(o) => !o && setBuying(null)} />}
    </div>
  );
};
