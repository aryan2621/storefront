#!/usr/bin/env node
/**
 * Create Razorpay subscription plans and print SQL to update products.razorpay_plan_id
 *
 * Usage:
 *   RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... node scripts/create-plans.mjs
 */

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  process.exit(1);
}

const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

const PLANS = [
  { productId: 'ai-agents', name: 'AI Agents Hosted (Monthly)', amount: 49900, period: 'monthly' },
  { productId: 'ai-agents-yearly', name: 'AI Agents Hosted (Yearly)', amount: 499900, period: 'yearly' },
  { productId: 'all-apps', name: 'All-Apps Pass (Yearly)', amount: 399900, period: 'yearly' },
];

async function createPlan(item) {
  const res = await fetch('https://api.razorpay.com/v1/plans', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      period: item.period,
      interval: 1,
      item: { name: item.name, amount: item.amount, currency: 'INR' },
    }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json();
}

for (const item of PLANS) {
  const plan = await createPlan(item);
  console.log(`-- ${item.productId}`);
  console.log(`UPDATE products SET razorpay_plan_id = '${plan.id}' WHERE id = '${item.productId}';`);
}
