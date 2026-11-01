use base64::prelude::*;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct License {
    pub lic: String,
    pub product: String,
    pub email: String,
    pub plan: String,
    pub seats: u32,
    pub issued: u64,
    pub updates_until: u64,
    pub expires: Option<u64>,
    pub kid: String,
}

#[derive(Debug, thiserror_no_std::Error)]
pub enum LicenseError {
    #[error("Malformed license key format")]
    MalformedFormat,
    #[error("Base64 decoding failed")]
    Base64Error,
    #[error("JSON deserialization failed")]
    JsonError,
    #[error("Invalid public key")]
    InvalidPublicKey,
    #[error("Digital signature mismatch")]
    InvalidSignature,
    #[error("Product mismatch")]
    ProductMismatch,
    #[error("License has expired")]
    Expired,
    #[error("Updates expired for this application build")]
    UpdatesExpired,
}

// Minimal error implementation without external thiserror crate dependency
impl std::fmt::Display for LicenseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LicenseError::MalformedFormat => write!(f, "Malformed license key format"),
            LicenseError::Base64Error => write!(f, "Base64 decoding failed"),
            LicenseError::JsonError => write!(f, "JSON deserialization failed"),
            LicenseError::InvalidPublicKey => write!(f, "Invalid public key bytes"),
            LicenseError::InvalidSignature => write!(f, "Digital signature verification failed"),
            LicenseError::ProductMismatch => write!(f, "License product mismatch"),
            LicenseError::Expired => write!(f, "License has expired"),
            LicenseError::UpdatesExpired => write!(f, "Updates have expired for this build version"),
        }
    }
}

impl std::error::Error for LicenseError {}

const CLOCK_SKEW_TOLERANCE_SECONDS: u64 = 3 * 86400; // 3 days

/// Verify a license key string completely offline using an Ed25519 public key.
pub fn verify_license(
    key_str: &str,
    expected_product: &str,
    raw_public_key_base64: &str,
    build_timestamp_seconds: u64,
) -> Result<License, LicenseError> {
    let mut parts = key_str.split('.');
    let payload_b64 = parts.next().ok_or(LicenseError::MalformedFormat)?;
    let sig_b64 = parts.next().ok_or(LicenseError::MalformedFormat)?;

    if parts.next().is_some() {
        return Err(LicenseError::MalformedFormat);
    }

    // 1. Decode payload and signature
    let payload_bytes = BASE64_STANDARD.decode(payload_b64).map_err(|_| LicenseError::Base64Error)?;
    let sig_bytes = BASE64_STANDARD.decode(sig_b64).map_err(|_| LicenseError::Base64Error)?;

    if sig_bytes.len() != 64 {
        return Err(LicenseError::InvalidSignature);
    }

    // 2. Decode raw 32-byte public key
    let pub_bytes = BASE64_STANDARD.decode(raw_public_key_base64).map_err(|_| LicenseError::Base64Error)?;
    let pub_slice: [u8; 32] = pub_bytes
        .as_slice()
        .try_into()
        .map_err(|_| LicenseError::InvalidPublicKey)?;

    let verifying_key = VerifyingKey::from_bytes(&pub_slice).map_err(|_| LicenseError::InvalidPublicKey)?;

    let sig_array: [u8; 64] = sig_bytes.as_slice().try_into().map_err(|_| LicenseError::InvalidSignature)?;
    let signature = Signature::from_bytes(&sig_array);

    // 3. Mathematical signature check
    verifying_key
        .verify(&payload_bytes, &signature)
        .map_err(|_| LicenseError::InvalidSignature)?;

    // 4. Parse license payload
    let license: License = serde_json::from_slice(&payload_bytes).map_err(|_| LicenseError::JsonError)?;

    // 5. Product check (exact match or '*' all-apps pass)
    if license.product != "*" && license.product != expected_product {
        return Err(LicenseError::ProductMismatch);
    }

    // 6. Check expiration (for subscriptions)
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if let Some(expires) = license.expires {
        if now > expires.saturating_add(CLOCK_SKEW_TOLERANCE_SECONDS) {
            return Err(LicenseError::Expired);
        }
    }

    // 7. Check build updates cutoff
    if license.updates_until > 0 && build_timestamp_seconds > license.updates_until {
        return Err(LicenseError::UpdatesExpired);
    }

    Ok(license)
}
