import React from 'react';
import { ClerkProvider, useAuth, useClerk } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiFetch, setSessionTokenGetter } from './api-fetch';

export const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const TokenBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken, isLoaded } = useAuth();
  // Set during render so children's first queries already carry the token.
  setSessionTokenGetter(() => getToken());
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      </div>
    );
  }
  return <>{children}</>;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  clerkKey ? (
    <ClerkProvider publishableKey={clerkKey}>
      <TokenBridge>{children}</TokenBridge>
    </ClerkProvider>
  ) : (
    <>{children}</>
  );

// clerkKey is fixed at build time, so the hook choice never changes between renders.
const useClerkState = clerkKey
  ? () => {
      const { isLoaded, isSignedIn } = useAuth();
      return { loaded: isLoaded, signedIn: !!isSignedIn };
    }
  : () => ({ loaded: true, signedIn: false });

export interface Session {
  email: string;
  role: 'admin' | 'customer';
}

/** The server decides the role; this only picks which UI to show. */
export function useSession() {
  const { loaded, signedIn } = useClerkState();
  return useQuery({
    queryKey: ['me', signedIn],
    enabled: loaded,
    retry: false,
    staleTime: 30_000,
    // The dev bypass can answer /api/me with no Clerk session; the UI must follow Clerk once it is configured.
    select: (data) => (clerkKey && !signedIn ? null : data),
    queryFn: async (): Promise<Session | null> => {
      const res = await apiFetch('/api/me');
      return res.ok ? res.json() : null;
    },
  });
}

/** Wraps an action (like opening checkout) so signed-out visitors get the sign-in modal first. */
export const useRequireSignIn = clerkKey
  ? () => {
      const { isSignedIn } = useAuth();
      const clerk = useClerk();
      return (go: () => void) => (isSignedIn ? go() : clerk.openSignIn({}));
    }
  : () => (go: () => void) => go();
