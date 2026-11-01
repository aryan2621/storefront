import { apiFetch } from './api-fetch';

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description_md: string;
  kind: 'one_time' | 'subscription';
  price_paise: number;
  period: 'month' | 'year' | null;
  updates_months: number;
  active: number;
  sort: number;
  repo_url?: string;
  download_url?: string;
  image_url?: string;
}

export interface CheckoutResponse {
  order_id?: string;
  razorpay_order_id?: string;
  subscription_id?: string;
  razorpay_subscription_id?: string;
  key_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  kind: 'one_time' | 'subscription';
  prefill: {
    email: string;
    name: string;
    contact: string;
  };
}

export interface VerifyResponse {
  success: boolean;
  orderId?: string;
  licenseKey?: string;
  productName?: string;
  downloadUrl?: string;
  paymentId?: string;
  pending?: boolean;
  subscription_id?: string;
}

export interface OrderStatusResponse {
  order_id: string;
  status: string;
  product_id: string;
  license_key?: string;
  product_name?: string;
  download_url?: string;
  landing_url?: string;
}

export async function fetchPublicConfig(): Promise<{ turnstile_site_key: string | null }> {
  const res = await fetch('/api/config/public');
  if (!res.ok) return { turnstile_site_key: null };
  return res.json();
}

/** Admin-only: there is no public product list. */
export async function fetchProducts(): Promise<Product[]> {
  const res = await apiFetch('/api/admin/products');
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return [];
    throw new Error('Failed to fetch products');
  }
  const data = await res.json();
  return data.products;
}

export async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error('Product not found');
  const data = await res.json();
  return data.product;
}

export async function fetchOrderStatus(orderId: string): Promise<OrderStatusResponse> {
  const res = await fetch(`/api/orders/${orderId}`);
  if (!res.ok) throw new Error('Order not found');
  return res.json();
}

export async function createCheckout(params: {
  product_id: string;
  email: string;
  name?: string;
  phone?: string;
  state?: string;
  gstin?: string;
  coupon?: string;
  turnstile_token?: string;
}): Promise<CheckoutResponse> {
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Checkout initiation failed');
  return data;
}

export async function verifyPayment(params: {
  razorpay_order_id?: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  razorpay_subscription_id?: string;
}): Promise<VerifyResponse> {
  const res = await fetch('/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Payment verification failed');
  return data;
}

export async function checkCoupon(productId: string, code: string): Promise<{
  valid: boolean;
  code?: string;
  percent_off?: number;
  amount_off_paise?: number;
  error?: string;
}> {
  const res = await fetch('/api/coupons/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, code }),
  });

  return res.json();
}
