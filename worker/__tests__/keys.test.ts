import { describe, expect, it } from 'vitest';
import { resolveProductPrivateKey, resolveProductPublicKey } from '../activation';
import type { Env } from '../types';

describe('signing key lookup', () => {
  const env = { LICENSE_KEY: 'shared-priv', LICENSE_PUBLIC_KEY: 'shared-pub', LICENSE_KEY_MURMUR: 'murmur-priv' } as unknown as Env;

  it('falls back to the shared key', async () => {
    expect(await resolveProductPrivateKey(env, 'capturita')).toBe('shared-priv');
    expect(await resolveProductPublicKey(env, 'capturita')).toBe('shared-pub');
  });

  it('prefers a product-specific key', async () => {
    expect(await resolveProductPrivateKey(env, 'murmur')).toBe('murmur-priv');
  });
});
