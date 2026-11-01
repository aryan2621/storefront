import { describe, it, expect, vi } from 'vitest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: async (token: string) => {
    if (token === 'verified') return { payload: { email: 'Buyer@Example.com', email_verified: true } };
    if (token === 'unverified') return { payload: { email: 'buyer@example.com', email_verified: false } };
    if (token === 'array') {
      return { payload: { email_addresses: [{ email_address: 'a@example.com', verification: { status: 'verified' } }] } };
    }
    if (token === 'stringbool') return { payload: { email: 'c@example.com', email_verified: 'true' } };
    throw new Error('bad token');
  },
}));

import { getCurrentUser } from '../access';

const env = { CLERK_JWKS_URL: 'https://clerk.test/jwks', ADMIN_EMAILS: 'owner@example.com', SITE_URL: 'https://x.example.com' } as any;
const user = (token?: string) => getCurrentUser(env, undefined, token ? `Bearer ${token}` : undefined);

describe('getCurrentUser', () => {
  it('lower-cases a verified email and marks it as a customer', async () => {
    expect(await user('verified')).toEqual({ email: 'buyer@example.com', isAdmin: false });
  });
  it('treats an unverified email as signed out', async () => expect(await user('unverified')).toBeNull());
  it('accepts a verified email_addresses array', async () => expect((await user('array'))?.email).toBe('a@example.com'));
  it('accepts email_verified rendered as the string "true"', async () => expect((await user('stringbool'))?.email).toBe('c@example.com'));
  it('rejects a bad token and a missing token', async () => {
    expect(await user('nope')).toBeNull();
    expect(await user()).toBeNull();
  });
  it('is signed out when JWKS is not configured', async () => {
    expect(await getCurrentUser({ ...env, CLERK_JWKS_URL: undefined }, undefined, 'Bearer verified')).toBeNull();
  });
});
