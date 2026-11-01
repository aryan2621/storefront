import React from 'react';
import { SignInButton, SignOutButton, UserButton } from '@clerk/clerk-react';
import { clerkKey, useSession } from '../lib/session';
import { Button } from './ui/button';

/** Sign-in button, or the user menu plus a visible Sign out. Renders nothing when Clerk is not configured (local dev). */
export const AuthControls: React.FC = () => {
  const me = useSession();
  if (!clerkKey || me.isLoading) return null;
  return me.data ? (
    <div className="flex items-center gap-2">
      <UserButton />
      <SignOutButton redirectUrl="/">
        <Button variant="outline" size="sm">
          Sign out
        </Button>
      </SignOutButton>
    </div>
  ) : (
    <SignInButton mode="modal">
      <Button size="sm">Sign in</Button>
    </SignInButton>
  );
};
