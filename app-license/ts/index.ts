export interface License {
  lic: string;
  product: string;
  email: string;
  plan: string;
  seats: number;
  issued: number;
  updates_until: number;
  expires: number | null;
  kid: string;
}

export interface VerifyResult {
  valid: boolean;
  license?: License;
  error?: string;
}

const CLOCK_SKEW_TOLERANCE = 3 * 86400; // 3 days

/**
 * Verify a license key string completely offline using WebCrypto / Node crypto.
 */
export async function verifyLicense(
  keyString: string,
  expectedProduct: string,
  rawPublicKeyBase64: string,
  buildTimestampSeconds: number = Math.floor(Date.now() / 1000)
): Promise<VerifyResult> {
  try {
    const parts = keyString.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed license key format' };
    }

    const [payloadBase64, sigBase64] = parts;
    const payloadBytes = Buffer.from(payloadBase64, 'base64');
    const signatureBytes = Buffer.from(sigBase64, 'base64');

    if (signatureBytes.length !== 64) {
      return { valid: false, error: 'Invalid signature length' };
    }

    const payload: License = JSON.parse(payloadBytes.toString('utf-8'));

    // Build SPKI from raw 32-byte public key
    const rawPub = Buffer.from(rawPublicKeyBase64, 'base64');
    const prefix = Buffer.from('302a300506032b6570032100', 'hex');
    const spki = Buffer.concat([prefix, rawPub]);

    const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : (await import('node:crypto')).webcrypto;

    const pubKey = await cryptoApi.subtle.importKey(
      'spki',
      spki,
      'Ed25519',
      false,
      ['verify']
    );

    const ok = await cryptoApi.subtle.verify(
      'Ed25519',
      pubKey,
      signatureBytes,
      payloadBytes
    );

    if (!ok) {
      return { valid: false, error: 'Digital signature verification failed' };
    }

    // Check product scope
    if (payload.product !== '*' && payload.product !== expectedProduct) {
      return { valid: false, error: `Product mismatch: ${payload.product} != ${expectedProduct}` };
    }

    const now = Math.floor(Date.now() / 1000);

    // Check expiration
    if (payload.expires !== null && payload.expires !== undefined) {
      if (now > payload.expires + CLOCK_SKEW_TOLERANCE) {
        return { valid: false, error: 'License has expired' };
      }
    }

    // Check build updates cutoff
    if (payload.updates_until && buildTimestampSeconds > payload.updates_until) {
      return { valid: false, error: 'Updates have expired for this build version' };
    }

    return { valid: true, license: payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Verification exception' };
  }
}
