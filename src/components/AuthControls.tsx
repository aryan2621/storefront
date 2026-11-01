import React from 'react';
import { SignInButton, UserButton } from '@clerk/clerk-react';
import { clerkKey, useSession } from '../lib/session';
import { Button } from './ui/button';

/** Sign-in button or user menu. Renders nothing when Clerk is not configured (local dev). */
export const AuthControls: React.FC = () => {
  const me = useSession();
  if (!clerkKey || me.isLoading) return null;
  return me.data ? (
    <UserButton />
  ) : (
    <SignInButton mode="modal">
      <Button size="sm">Sign in</Button>
    </SignInButton>
  );
};
