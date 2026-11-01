import { Env } from './types';
import { hmacSha256Hex } from './razorpay';

export async function createCancelToken(env: Env, subscriptionId: string, email: string): Promise<string> {
  const secret = env.CANCEL_TOKEN_SECRET || env.RAZORPAY_WEBHOOK_SECRET;
  const exp = Math.floor(Date.now() / 1000) + 90 * 86400;
  const payload = `${subscriptionId}|${email}|${exp}`;
  const sig = await hmacSha256Hex(payload, secret);
  return btoa(`${payload}|${sig}`);
}

export async function verifyCancelToken(
  env: Env,
  token: string
): Promise<{ subscriptionId: string; email: string } | null> {
  try {
    const decoded = atob(token);
    const parts = decoded.split('|');
    if (parts.length !== 4) {
      return null;
    }
    const [subscriptionId, email, expStr, sig] = parts;
    const secret = env.CANCEL_TOKEN_SECRET || env.RAZORPAY_WEBHOOK_SECRET;
    const payload = `${subscriptionId}|${email}|${expStr}`;
    const expected = await hmacSha256Hex(payload, secret);
    if (expected !== sig) {
      return null;
    }
    if (Number(expStr) < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { subscriptionId, email };
  } catch {
    return null;
  }
}
