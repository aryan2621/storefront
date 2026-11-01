export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;

  CHECKOUT_LIMITER?: RateLimit;
  REFRESH_LIMITER?: RateLimit;

  LICENSE_KID: string;
  SITE_URL: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  ADMIN_EMAIL?: string;
  ADMIN_EMAILS?: string;
  SELLER_NAME: string;
  SELLER_STATE: string;
  SELLER_GSTIN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_DEV_BYPASS?: string;
  TURNSTILE_SITE_KEY?: string;
  CLERK_JWKS_URL?: string;
  CLERK_ISSUER?: string;
  CLERK_JWT_AUDIENCE?: string;

  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RESEND_API_KEY?: string;
  BREVO_API_KEY?: string;
  CANCEL_TOKEN_SECRET?: string;
  TURNSTILE_SECRET?: string;
  [key: string]: any;
}

export interface LicensePayload {
  v?: number;
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
