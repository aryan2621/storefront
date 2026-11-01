import React from 'react';
import { SignInButton, UserButton, useAuth } from '@clerk/clerk-react';
import { clerkKey, useSession } from '../lib/session';
import { Button } from './ui/button';

/** Sign-in button, or the Clerk user menu (which holds Sign out). Renders nothing when Clerk is not configured (local dev). */
export const AuthControls: React.FC = () => {
  const me = useSession();
  const { isSignedIn } = useAuth();
  if (!clerkKey || me.isLoading) return null;
  // Follow Clerk itself: signed in with Clerk but rejected by the server must not look signed out.
  return isSignedIn ? (
    <UserButton afterSignOutUrl="/" />
  ) : (
    <SignInButton mode="modal">
      <Button size="sm">Sign in</Button>
    </SignInButton>
  );
};
