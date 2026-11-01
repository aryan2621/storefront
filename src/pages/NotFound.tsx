import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export const NotFound: React.FC = () => (
  <div className="mx-auto max-w-lg px-4 py-24 text-center">
    <p className="font-mono-price text-6xl font-semibold text-[var(--color-muted)]" aria-hidden>404</p>
    <h1 className="mt-4 text-3xl font-extrabold">Return to sender</h1>
    <p className="mt-2 text-[var(--color-muted)]">There&apos;s no page at this address.</p>
    <Button className="mt-6" variant="outline" size="lg" asChild>
      <Link to="/">Back to storefront</Link>
    </Button>
  </div>
);
