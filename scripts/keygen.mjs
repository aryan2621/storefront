import crypto from 'node:crypto';

// Generate Ed25519 key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

// Export private key as PKCS8 base64
const privateKeyBase64 = privateKey.export({
  type: 'pkcs8',
  format: 'der',
}).toString('base64');

// Export public key as SPKI base64
const publicKeyBase64 = publicKey.export({
  type: 'spki',
  format: 'der',
}).toString('base64');

// Also export raw 32 bytes public key (useful for Tauri/Rust and direct verification)
// In SPKI for Ed25519, the last 32 bytes are the raw public key
const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
const rawPublicKeyBase64 = spkiDer.subarray(spkiDer.length - 32).toString('base64');

// No argument = the shared key used by every product. Pass a product id for a product-specific key.
const arg = process.argv[2]?.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
const suffix = arg ? `_${arg}` : '';
console.log(`=== Ed25519 keypair (${arg ? `product ${arg}` : 'shared, all products'}) ===`);
console.log(`\nLICENSE_KEY${suffix} (PKCS8 base64, secret: back up to the vault):`);
console.log(privateKeyBase64);
console.log(`\nLICENSE_PUBLIC_KEY${suffix} (SPKI base64):`);
console.log(publicKeyBase64);
console.log('\nRaw 32-byte public key (embed in the desktop app build):');
console.log(rawPublicKeyBase64);
