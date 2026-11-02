import React from 'react';
import { SignInButton, UserButton } from '@clerk/clerk-react';
import { clerkKey, useClerkState, useSession } from '../lib/session';
import { Button } from './ui/button';

/** Sign-in button, or the Clerk user menu (which holds Sign out). Renders nothing when Clerk is not configured (local dev). */
export const AuthControls: React.FC = () => {
  const me = useSession();
  const { signedIn } = useClerkState(); // safe without a Clerk key; calling useAuth here would throw outside ClerkProvider
  if (!clerkKey || me.isLoading) return null;
  // Follow Clerk itself: signed in with Clerk but rejected by the server must not look signed out.
  return signedIn ? (
    <UserButton afterSignOutUrl="/" />
  ) : (
    <SignInButton mode="modal">
      <Button size="sm">Sign in</Button>
    </SignInButton>
  );
};
