import { z } from 'zod';

export const checkoutSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  name: z.string().optional(),
  phone: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().optional(),
  coupon: z.string().optional(),
  turnstile_token: z.string().optional(),
});

export const verifySchema = z
  .object({
    razorpay_order_id: z.string().optional(),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
    razorpay_subscription_id: z.string().optional(),
  })
  .refine((d) => d.razorpay_order_id || d.razorpay_subscription_id, {
    message: 'Order or subscription id required',
  });

export const couponCheckSchema = z.object({
  product_id: z.string().min(1),
  code: z.string().min(1).transform((c) => c.trim().toUpperCase()),
});


export const refreshLicenseSchema = z.object({
  key: z.string().min(10, 'Invalid license key format'),
});

export const adminIssueLicenseSchema = z.object({
  email: z.string().email().transform((e) => e.trim().toLowerCase()),
  product_id: z.string().min(1),
  plan: z.enum(['pro', 'teams', 'all']).default('pro'),
  notes: z.string().optional(),
});

export const adminRefundSchema = z.object({
  amount_paise: z.number().int().positive().optional(),
  reason: z.string().optional(),
});

export const adminPatchCustomerSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  state: z.string().optional(),
  gstin: z.string().optional(),
});

export const adminPatchProductSchema = z.object({
  name: z.string().optional(),
  tagline: z.string().optional(),
  description_md: z.string().nullable().optional(),
  coming_soon: z.number().int().min(0).max(1).optional(),
  kind: z.enum(['one_time', 'subscription']).optional(),
  price_paise: z.number().int().nonnegative().optional(),
  period: z.enum(['month', 'year']).nullable().optional(),
  razorpay_plan_id: z.string().nullable().optional(),
  max_devices: z.number().int().min(1).optional(),
  offline_grace_days: z.number().int().min(0).optional(),
  refund_window_days: z.number().int().min(0).optional(),
  license_kid: z.string().optional(),
  landing_url: z.string().url().nullable().optional(),
  allowed_origins: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  updates_months: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  sort: z.number().int().optional(),
  repo_url: z.string().url().nullable().optional(),
  download_url: z.string().url().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
});

export const activateLicenseSchema = z.object({
  key: z.string().min(10, 'Invalid license key format'),
  product_id: z.string().min(1, 'Product is required'),
  device_id: z.string().regex(/^[0-9a-f]{64}$/i, 'Device id must be a 64-character hex hash'),
  device_name: z.string().optional(),
});

export const deactivateLicenseSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  key: z.string().min(1, 'Key is required'),
  device_id: z.string().min(1, 'Device is required'),
});
