import { Env } from './types';

/**
 * Finds the customer row a signed-in user owns.
 * With a Clerk user id the link is the id: the first sign-in claims the customer that has the same verified email,
 * and after that nobody else can claim it, even with the same email. Without an id (dev bypass, Cloudflare Access) it falls back to email.
 */
export async function findCustomerId(env: Env, user: { email: string; userId?: string }): Promise<string | null> {
  if (!user.userId) {
    const row = await env.DB.prepare('SELECT id FROM customers WHERE email = ?').bind(user.email).first<{ id: string }>();
    return row?.id ?? null;
  }
  const linked = () => env.DB.prepare('SELECT id FROM customers WHERE clerk_user_id = ?').bind(user.userId).first<{ id: string }>();
  const existing = await linked();
  if (existing) return existing.id;
  const claim = await env.DB.prepare('UPDATE customers SET clerk_user_id = ? WHERE email = ? AND clerk_user_id IS NULL')
    .bind(user.userId, user.email)
    .run();
  return claim.meta.changes ? (await linked())?.id ?? null : null;
}
