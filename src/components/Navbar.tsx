import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useSession } from '../lib/session';
import { AuthControls } from './AuthControls';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex h-11 items-center px-2.5 text-[0.9375rem] font-semibold underline-offset-[0.35em] decoration-2 transition-colors sm:px-3 ${
    isActive
      ? 'text-[var(--color-foreground)] underline'
      : 'text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
  }`;

type Theme = 'light' | 'dark';

const currentTheme = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ??
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => setTheme(currentTheme()), []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode: theme still applies for this page */
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
};

export const Navbar: React.FC = () => {
  const me = useSession().data;

  return (
    <>
      {me && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2 text-center text-sm font-medium text-[var(--color-foreground)] sm:px-6">
            Logged in — access your license, product access, and downloads from your account.
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface-0)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="Storefront home">
            <img src="/favicon.svg" alt="" width={32} height={32} className="h-8 w-8 shrink-0" />
            <span className="truncate text-lg font-extrabold tracking-tight">Storefront</span>
          </Link>

          <nav className="flex items-center" aria-label="Main">
            {me && (
              <NavLink to="/account" className={linkClass}>
                My licenses
              </NavLink>
            )}
            {me && (
              <NavLink to="/" end className={linkClass}>
                Home
              </NavLink>
            )}
            {me?.role === 'admin' && (
              <NavLink to="/admin" className={linkClass}>
                Admin
              </NavLink>
            )}
            <ThemeToggle />
            <AuthControls />
          </nav>
        </div>
      </header>
    </>
  );
};
