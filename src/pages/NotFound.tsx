import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Postmark } from '../components/Postmark';

export const NotFound: React.FC = () => (
  <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
    <div className="perforated w-full max-w-md bg-[var(--color-sheet)] drop-shadow-[0_1px_1px_rgb(0_0_0/0.12)]" style={{ ['--perf' as string]: '12px' }}>
      <div className="relative bg-[var(--color-stamp-paper)] px-8 pb-8 pt-10 text-left text-[var(--color-stamp-ink)]">
        <p className="font-mono-price text-7xl font-semibold tracking-tight text-[var(--color-stamp)]" aria-hidden>
          404
        </p>
        <Postmark
          waves
          top="STOREFRONT"
          middle="N/A"
          bottom="RETURNED"
          className="postmark-thump absolute -right-10 top-5 hidden w-56 -rotate-6 opacity-90 sm:block"
        />
        <p className="mt-6 font-mono-price text-[11px] uppercase tracking-[0.2em] text-[var(--color-stamp-ink-muted)]">Undeliverable · no such address</p>
      </div>
    </div>
    <h1 className="mt-10 text-3xl font-extrabold">Return to sender</h1>
    <p className="mt-2 text-[var(--color-muted)]">This page was never posted, or it has moved. Nothing is lost.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Button size="lg" variant="outline" asChild>
        <Link to="/">Back to storefront</Link>
      </Button>
      <Button size="lg" variant="ghost" asChild>
        <Link to="/contact">Contact support</Link>
      </Button>
    </div>
  </div>
);
