import { Env } from './types';
import { signJson } from './license';

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function productEnvSuffix(productId: string): string {
  return productId.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
}

function envString(env: Env, name: string): string | undefined {
  const value = (env as Record<string, unknown>)[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export async function resolveProductPublicKey(env: Env, productId: string): Promise<string | null> {
  const suffix = productEnvSuffix(productId);
  return envString(env, `LICENSE_PUBLIC_KEY_${suffix}`) || envString(env, `LICENSE_KEY_PUBLIC_${suffix}`) || envString(env, 'LICENSE_PUBLIC_KEY') || null; // shared key for all products unless one has its own
}

export async function resolveProductPrivateKey(env: Env, productId: string): Promise<string | null> {
  const suffix = productEnvSuffix(productId);
  return envString(env, `LICENSE_KEY_${suffix}`) || envString(env, `LICENSE_PRIVATE_KEY_${suffix}`) || envString(env, 'LICENSE_KEY') || null;
}

export async function createActivationToken(
  env: Env,
  productId: string,
  deviceId: string,
  licenseId: string,
  kid: string
): Promise<string> {
  const secret = await resolveProductPrivateKey(env, productId);
  if (!secret) {
    throw new Error('Product license configuration missing');
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TOKEN_TTL_SECONDS;
  return signJson(
    {
      type: 'device_activate',
      iat,
      product: productId,
      kid,
      device_id: deviceId,
      license_id: licenseId,
      exp,
    },
    secret
  );
}


export async function getSeatLimitDetails(
  env: Env,
  licenseId: string
): Promise<Array<{ id?: string; device_id: string; device_name: string | null; activated_at: number }>> {
  const rows = await env.DB.prepare(
    `SELECT id, device_id, device_name, activated_at FROM activations WHERE license_id = ? AND deactivated_at IS NULL ORDER BY activated_at DESC`
  )
    .bind(licenseId)
    .all<any>();
  return rows.results.map((row) => ({
    id: row.id,
    device_id: row.device_id,
    device_name: row.device_name,
    activated_at: row.activated_at,
  }));
}

async function refreshExistingSeat(
  env: Env,
  existing: any,
  deviceName: string | undefined,
  productId: string,
  deviceId: string,
  licenseId: string,
  kid: string,
  maxDevices: number
) {
  const updatedAt = Math.floor(Date.now() / 1000);
  await env.DB.prepare('UPDATE activations SET device_name = COALESCE(?, device_name), last_seen_at = ? WHERE id = ?')
    .bind(deviceName || existing.device_name || null, updatedAt, existing.id)
    .run();

  const token = await createActivationToken(env, productId, deviceId, licenseId, kid);
  return {
    status: 200,
    json: {
      ok: true,
      token,
      license_id: licenseId,
      product_id: productId,
      device_id: deviceId,
      expires_at: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
      seat_limit: maxDevices,
      devices: await getSeatLimitDetails(env, licenseId),
    },
  };
}
