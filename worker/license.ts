import { LicensePayload } from './types';

// Convert Uint8Array to base64
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to Uint8Array
function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Sign a license payload using the Ed25519 private key (PKCS8 base64).
 * Returns: base64(JSON_PAYLOAD) + "." + base64(SIGNATURE)
 */
export async function signJson(payload: object, privateKeyBase64: string): Promise<string> {
  const derBytes = fromBase64(privateKeyBase64);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    derBytes,
    'Ed25519',
    false,
    ['sign']
  );

  const jsonString = JSON.stringify(payload);
  const dataBytes = new TextEncoder().encode(jsonString);
  const signatureBuffer = await crypto.subtle.sign('Ed25519', privateKey, dataBytes);
  const signatureBytes = new Uint8Array(signatureBuffer);

  return `${toBase64(dataBytes)}.${toBase64(signatureBytes)}`;
}

export async function signLicense(payload: LicensePayload, privateKeyBase64: string): Promise<string> {
  return signJson(payload, privateKeyBase64);
}

/**
 * Verify a license key string with an Ed25519 public key (SPKI or 32-byte raw base64).
 */
export async function verifyLicense(
  keyString: string,
  expectedProduct: string,
  publicKeyBase64: string,
  buildTimestampSeconds: number = Math.floor(Date.now() / 1000)
): Promise<{ valid: boolean; payload?: LicensePayload; error?: string }> {
  try {
    const parts = keyString.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'Malformed license key format' };
    }

    const [payloadBase64, signatureBase64] = parts;
    const payloadBytes = fromBase64(payloadBase64);
    const signatureBytes = fromBase64(signatureBase64);

    const jsonString = new TextDecoder().decode(payloadBytes);
    const payload: LicensePayload = JSON.parse(jsonString);

    // Import public key (support both SPKI and raw 32-byte key)
    let spkiBytes = fromBase64(publicKeyBase64);
    if (spkiBytes.length === 32) {
      // Prepend Ed25519 SPKI prefix: 302a300506032b6570032100
      const prefix = new Uint8Array([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]);
      const combined = new Uint8Array(prefix.length + 32);
      combined.set(prefix, 0);
      combined.set(spkiBytes, prefix.length);
      spkiBytes = combined;
    }

    const pubKey = await crypto.subtle.importKey(
      'spki',
      spkiBytes,
      'Ed25519',
      false,
      ['verify']
    );

    const isValidSig = await crypto.subtle.verify(
      'Ed25519',
      pubKey,
      signatureBytes,
      payloadBytes
    );

    if (!isValidSig) {
      return { valid: false, error: 'Invalid digital signature' };
    }

    if (payload.product !== expectedProduct) {
      return { valid: false, error: `License product mismatch: ${payload.product} != ${expectedProduct}` };
    }

    const now = Math.floor(Date.now() / 1000);
    const CLOCK_SKEW_TOLERANCE = 3 * 86400; // 3 days tolerance

    // Check expiration if present (subscription products)
    if (payload.expires !== null && payload.expires !== undefined) {
      if (now > payload.expires + CLOCK_SKEW_TOLERANCE) {
        return { valid: false, error: 'License has expired' };
      }
    }

    // Check updates cutoff against app build timestamp
    if (payload.updates_until && buildTimestampSeconds > payload.updates_until) {
      return { valid: false, error: 'Updates for this license have expired for this build' };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Verification exception' };
  }
}
