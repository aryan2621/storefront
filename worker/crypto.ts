const enc = new TextEncoder();

async function hmacHex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time compare. Hashing first makes both sides the same length, so length is not leaked either. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([a, b].map(async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)))));
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const TOKEN_TTL_SECONDS = 7 * 86400;

/**
 * Secret for one order's success page: "expiry.HMAC(order id, expiry)".
 * An order id alone reveals nothing, and a leaked success URL stops working after a week.
 */
export async function orderToken(orderId: string, secret: string, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const exp = now + TOKEN_TTL_SECONDS;
  return `${exp}.${await hmacHex(`order:${orderId}:${exp}`, secret)}`;
}

export async function checkOrderToken(orderId: string, token: string, secret: string | undefined, now = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const [exp, mac] = token.split('.');
  if (!secret || !/^\d+$/.test(exp ?? '') || !mac || Number(exp) < now) return false;
  return safeEqual(await hmacHex(`order:${orderId}:${exp}`, secret), mac);
}
