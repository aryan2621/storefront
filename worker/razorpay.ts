// worker/razorpay.ts: Razorpay API fetch client and HMAC helpers

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  fee: number;
  tax: number;
  international: boolean;
  email: string;
  contact: string;
  notes: Record<string, any>;
  created_at: number;
}

export interface RazorpayRefundResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  created_at: number;
}

export interface RazorpayPlanResponse {
  id: string;
  entity: string;
  interval: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  item: { name: string; amount: number; currency: string };
}

export interface RazorpaySubscriptionResponse {
  id: string;
  entity: string;
  plan_id: string;
  status: string;
  current_start?: number;
  current_end?: number;
  paid_count: number;
  notes?: Record<string, string>;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Compute HMAC-SHA256 hex digest using WebCrypto
 */
export async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Razorpay API client using native fetch
 */
export class RazorpayClient {
  private authHeader: string;
  private keyId: string;
  private keySecret: string;
  private baseUrl = 'https://api.razorpay.com/v1';

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      let parsedErr: any;
      try {
        parsedErr = JSON.parse(errText);
      } catch {
        parsedErr = { error: { description: errText } };
      }
      throw new Error(parsedErr.error?.description || `Razorpay API error: ${res.status}`);
    }

    return (await res.json()) as T;
  }

  async createOrder(params: {
    amount: number; // paise
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrderResponse> {
    return this.request<RazorpayOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || 'INR',
        receipt: params.receipt,
        notes: params.notes || {},
      }),
    });
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPaymentResponse> {
    return this.request<RazorpayPaymentResponse>(`/payments/${paymentId}`);
  }

  async createPlan(params: {
    period: 'monthly' | 'yearly';
    interval?: number;
    name: string;
    amount: number;
    currency?: string;
  }): Promise<RazorpayPlanResponse> {
    return this.request<RazorpayPlanResponse>('/plans', {
      method: 'POST',
      body: JSON.stringify({
        period: params.period,
        interval: params.interval ?? 1,
        item: {
          name: params.name,
          amount: params.amount,
          currency: params.currency || 'INR',
        },
      }),
    });
  }

  async createSubscription(params: {
    plan_id: string;
    total_count: number;
    customer_notify?: number;
    notes?: Record<string, string>;
  }): Promise<RazorpaySubscriptionResponse> {
    return this.request<RazorpaySubscriptionResponse>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: params.plan_id,
        total_count: params.total_count,
        customer_notify: params.customer_notify ?? 1,
        notes: params.notes || {},
      }),
    });
  }

  async fetchSubscription(subscriptionId: string): Promise<RazorpaySubscriptionResponse> {
    return this.request<RazorpaySubscriptionResponse>(`/subscriptions/${subscriptionId}`);
  }

  async cancelSubscription(subscriptionId: string, cancelAtCycleEnd = true): Promise<RazorpaySubscriptionResponse> {
    return this.request<RazorpaySubscriptionResponse>(`/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
    });
  }

  async listPayments(params: { from: number; to: number; count?: number }): Promise<{ items: RazorpayPaymentResponse[] }> {
    const count = params.count ?? 100;
    return this.request<{ items: RazorpayPaymentResponse[] }>(
      `/payments?from=${params.from}&to=${params.to}&count=${count}`
    );
  }

  async refundPayment(paymentId: string, amountPaise?: number, notes?: Record<string, string>): Promise<RazorpayRefundResponse> {
    const body: Record<string, any> = {};
    if (amountPaise) body.amount = amountPaise;
    if (notes) body.notes = notes;

    return this.request<RazorpayRefundResponse>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    const payload = `${orderId}|${paymentId}`;
    const expected = await hmacSha256Hex(payload, this.keySecret);
    return timingSafeEqual(expected, signature);
  }

  async verifySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string): Promise<boolean> {
    const payload = `${paymentId}|${subscriptionId}`;
    const expected = await hmacSha256Hex(payload, this.keySecret);
    return timingSafeEqual(expected, signature);
  }

  static async verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string): Promise<boolean> {
    const expected = await hmacSha256Hex(rawBody, webhookSecret);
    return timingSafeEqual(expected, signature);
  }
}
