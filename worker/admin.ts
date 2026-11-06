import { Hono } from 'hono';
import { Env } from './types';
import { adminAccessMiddleware } from './access';
import { adminIssueLicenseSchema, adminRefundSchema, adminPatchCustomerSchema, adminPatchProductSchema } from './schema';
import { RazorpayClient } from './razorpay';
import { signLicense } from './license';
import { LicensePayload } from './types';
import { writeAdminAudit } from './audit';
import { sendEmail, renderRecoveryEmail, renderRefundEmail } from './email';
import { resolveProductPrivateKey } from './activation';

function parseRange(c: { req: { query: (k: string) => string | undefined } }) {
  const fromQ = c.req.query('from');
  const toQ = c.req.query('to');
  const now = Math.floor(Date.now() / 1000);
  const to = toQ ? Number(toQ) : now;
  const from = fromQ ? Number(fromQ) : now - 30 * 86400;
  return { from, to, product: c.req.query('product') || null };
}

export function createAdminRouter() {
  const admin = new Hono<{ Bindings: Env; Variables: { admin_email?: string } }>();
  admin.use('*', adminAccessMiddleware);

  admin.get('/me', (c) => c.json({ email: c.get('admin_email') }));

  admin.get('/overview', async (c) => {
    const { from, to, product } = parseRange(c);
    const productFilter = product ? 'AND p.product_id = ?' : '';
    const binds = product ? [from, to, product] : [from, to];

    const revenueResult = await c.env.DB.prepare(`
      SELECT
        COALESCE(SUM(amount_paise), 0) as gross_revenue,
        COALESCE(SUM(refunded_paise), 0) as refunds,
        COALESCE(SUM(fee_paise + fee_tax_paise), 0) as razorpay_fees
      FROM payments p
      WHERE p.status IN ('captured', 'refunded', 'partially_refunded', 'disputed')
        AND p.created_at >= ? AND p.created_at <= ? ${productFilter}
    `).bind(...binds).first<any>();

    const customersResult = await c.env.DB.prepare('SELECT COUNT(*) as count FROM customers').first<any>();
    const licensesResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM licenses WHERE status = "active"'
    ).first<any>();

    const mrrResult = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(
        CASE WHEN pr.period = 'year' THEN pr.price_paise / 12 ELSE pr.price_paise END
      ), 0) as mrr_paise
      FROM subscriptions s
      JOIN products pr ON s.product_id = pr.id
      WHERE s.status IN ('active', 'pending')
    `).first<any>();

    const activeSubs = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM subscriptions WHERE status IN ('active', 'pending')`
    ).first<any>();

    const gross = revenueResult?.gross_revenue || 0;
    const refunds = revenueResult?.refunds || 0;
    const fees = revenueResult?.razorpay_fees || 0;
    const net = gross - refunds;

    const recent = await c.env.DB.prepare(`
      SELECT p.id, p.amount_paise, p.method, p.status, p.created_at, pr.name as product_name, c.email
      FROM payments p
      JOIN products pr ON p.product_id = pr.id
      JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC LIMIT 10
    `).all<any>();

    return c.json({
      kpis: {
        gross_revenue_paise: gross,
        refunds_paise: refunds,
        net_revenue_paise: net,
        fees_paise: fees,
        take_home_paise: net - fees,
        customer_count: customersResult?.count || 0,
        active_licenses: licensesResult?.count || 0,
        mrr_paise: mrrResult?.mrr_paise || 0,
        arr_paise: (mrrResult?.mrr_paise || 0) * 12,
        active_subscribers: activeSubs?.count || 0,
      },
      recent_payments: recent.results,
    });
  });

  admin.get('/series', async (c) => {
    const { from, to, product } = parseRange(c);
    const metric = c.req.query('metric') || 'revenue';
    const interval = c.req.query('interval') === 'month' ? 'month' : 'day';
    const fmt = interval === 'month' ? '%Y-%m' : '%Y-%m-%d';

    if (metric === 'mrr' || metric === 'subscribers') {
      const rows = await c.env.DB.prepare(`
        SELECT strftime('${fmt}', updated_at, 'unixepoch', '+5 hours', '+30 minutes') as bucket,
               COUNT(*) as value
        FROM subscriptions
        WHERE status IN ('active','pending') AND updated_at >= ? AND updated_at <= ?
        GROUP BY bucket ORDER BY bucket
      `).bind(from, to).all<any>();
      return c.json({ series: rows.results });
    }

    const productClause = product ? 'AND product_id = ?' : '';
    const binds = product ? [from, to, product] : [from, to];
    const rows = await c.env.DB.prepare(`
      SELECT strftime('${fmt}', created_at, 'unixepoch', '+5 hours', '+30 minutes') as bucket,
             product_id,
             SUM(amount_paise) as revenue_paise,
             COUNT(*) as payments
      FROM payments
      WHERE status = 'captured' AND created_at >= ? AND created_at <= ? ${productClause}
      GROUP BY bucket, product_id ORDER BY bucket
    `).bind(...binds).all<any>();

    return c.json({ series: rows.results });
  });

  admin.get('/payments', async (c) => {
    const payments = await c.env.DB.prepare(`
      SELECT p.*, pr.name as product_name, c.email as customer_email
      FROM payments p
      JOIN products pr ON p.product_id = pr.id
      JOIN customers c ON p.customer_id = c.id
      ORDER BY p.created_at DESC LIMIT 200
    `).all();
    return c.json({ payments: payments.results });
  });

  admin.get('/customers', async (c) => {
    const q = c.req.query('q');
    const customers = q
      ? await c.env.DB.prepare(`
          SELECT c.*, COUNT(DISTINCT l.id) as license_count,
            COALESCE(SUM(p.amount_paise), 0) as total_spent_paise
          FROM customers c
          LEFT JOIN licenses l ON c.id = l.customer_id AND l.status = 'active'
          LEFT JOIN payments p ON c.id = p.customer_id AND p.status = 'captured'
          WHERE c.email LIKE ?
          GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100
        `).bind(`%${q}%`).all()
      : await c.env.DB.prepare(`
          SELECT c.*, COUNT(DISTINCT l.id) as license_count,
            COALESCE(SUM(p.amount_paise), 0) as total_spent_paise
          FROM customers c
          LEFT JOIN licenses l ON c.id = l.customer_id AND l.status = 'active'
          LEFT JOIN payments p ON c.id = p.customer_id AND p.status = 'captured'
          GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100
        `).all();
    return c.json({ customers: customers.results });
  });

  // Everyone who has signed in (Clerk), with the country stored while they consent to analytics.
  admin.get('/analytics/users', async (c) => {
    const users = await c.env.DB.prepare(`
      SELECT u.clerk_user_id AS id, u.email, u.country, u.analytics_consent, u.first_seen_at, u.last_seen_at,
        EXISTS (SELECT 1 FROM customers cu WHERE cu.email = lower(u.email)) AS buyer
      FROM app_users u ORDER BY u.last_seen_at DESC LIMIT 500
    `).all();
    return c.json({ users: users.results });
  });

  admin.get('/analytics/countries', async (c) => {
    const countries = await c.env.DB.prepare(`
      SELECT country AS id, country, SUM(users) AS users, SUM(views) AS views FROM (
        SELECT COALESCE(country, 'Unknown') AS country, COUNT(*) AS users, 0 AS views FROM app_users GROUP BY 1
        UNION ALL
        SELECT COALESCE(country, 'Unknown'), 0, COUNT(*) FROM page_views GROUP BY 1
      ) GROUP BY country ORDER BY users DESC, views DESC
    `).all();
    return c.json({ countries: countries.results });
  });

  admin.patch('/customers/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = adminPatchCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0].message }, 400);
    }
    const { email, name, phone, state, gstin } = parsed.data;
    await c.env.DB.prepare(`
      UPDATE customers SET
        email = COALESCE(?, email),
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        state = COALESCE(?, state),
        gstin = COALESCE(?, gstin)
      WHERE id = ?
    `).bind(email || null, name || null, phone || null, state || null, gstin || null, id).run();

    await writeAdminAudit(c.env, c.get('admin_email') || 'admin', 'customer.patch', id, parsed.data);
    return c.json({ success: true });
  });

  admin.get('/products/:id', async (c) => {
    const id = c.req.param('id');
    const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<any>();
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }
    return c.json({ product });
  });

  admin.patch('/products/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = adminPatchProductSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const updates = parsed.data;
    const allowedOrigins = updates.allowed_origins;
    if (allowedOrigins !== undefined) {
      if (Array.isArray(allowedOrigins)) {
        updates.allowed_origins = JSON.stringify(allowedOrigins);
      } else if (typeof allowedOrigins === 'string') {
        updates.allowed_origins = allowedOrigins;
      }
    }

    const fields = Object.entries(updates)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);

    if (fields.length === 0) {
      return c.json({ success: true, product: await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<any>() });
    }

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const values = fields.map((field) => (updates as Record<string, any>)[field]);
    values.push(id);

    await c.env.DB.prepare(`UPDATE products SET ${setClause} WHERE id = ?`).bind(...values).run();

    const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first<any>();
    await writeAdminAudit(c.env, c.get('admin_email') || 'admin', 'product.patch', id, parsed.data);
    return c.json({ success: true, product });
  });

  admin.get('/subscriptions', async (c) => {
    const status = c.req.query('status');
    const subs = status
      ? await c.env.DB.prepare(`
          SELECT s.*, c.email, p.name as product_name
          FROM subscriptions s
          JOIN customers c ON s.customer_id = c.id
          JOIN products p ON s.product_id = p.id
          WHERE s.status = ?
          ORDER BY s.updated_at DESC LIMIT 200
        `).bind(status).all()
      : await c.env.DB.prepare(`
          SELECT s.*, c.email, p.name as product_name
          FROM subscriptions s
          JOIN customers c ON s.customer_id = c.id
          JOIN products p ON s.product_id = p.id
          ORDER BY s.updated_at DESC LIMIT 200
        `).all();
    return c.json({ subscriptions: subs.results });
  });

  admin.get('/licenses', async (c) => {
    const q = c.req.query('q');
    const licenses = q
      ? await c.env.DB.prepare(`
          SELECT l.*, p.name as product_name, c.email as customer_email
          FROM licenses l
          JOIN products p ON l.product_id = p.id
          JOIN customers c ON l.customer_id = c.id
          WHERE c.email LIKE ? OR l.id LIKE ?
          ORDER BY l.issued_at DESC LIMIT 200
        `).bind(`%${q}%`, `%${q}%`).all()
      : await c.env.DB.prepare(`
          SELECT l.*, p.name as product_name, c.email as customer_email
          FROM licenses l
          JOIN products p ON l.product_id = p.id
          JOIN customers c ON l.customer_id = c.id
          ORDER BY l.issued_at DESC LIMIT 200
        `).all();
    return c.json({ licenses: licenses.results });
  });

  admin.get('/events', async (c) => {
    const events = await c.env.DB.prepare(
      'SELECT id, type, received_at, processed_at, error FROM events ORDER BY received_at DESC LIMIT 200'
    ).all();
    return c.json({ events: events.results });
  });

  admin.get('/products', async (c) => {
    const products = await c.env.DB.prepare('SELECT * FROM products ORDER BY sort ASC').all();
    return c.json({ products: products.results });
  });

  admin.get('/coupons', async (c) => {
    const coupons = await c.env.DB.prepare('SELECT * FROM coupons ORDER BY code ASC').all();
    return c.json({ coupons: coupons.results });
  });

  admin.post('/licenses', async (c) => {
    const body = await c.req.json();
    const parsed = adminIssueLicenseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0].message }, 400);
    }

    const { email, product_id, plan } = parsed.data;
    const now = Math.floor(Date.now() / 1000);

    let customer = await c.env.DB.prepare('SELECT id FROM customers WHERE email = ?').bind(email).first<any>();
    let customerId = customer?.id;
    if (!customerId) {
      customerId = `cust_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      await c.env.DB.prepare('INSERT INTO customers (id, email, created_at) VALUES (?, ?, ?)')
        .bind(customerId, email, now).run();
    }

    const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(product_id).first<any>();
    if (!product) {
      return c.json({ error: 'Product not found' }, 404);
    }

    const licId = `lic_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    // Calendar months, the same as paid orders (see fulfill.ts).
    const until = new Date(now * 1000);
    until.setUTCMonth(until.getUTCMonth() + (product.updates_months ?? 12));
    const updatesUntil = Math.floor(until.getTime() / 1000);
    const productKey = await resolveProductPrivateKey(c.env, product_id);
    if (!productKey) {
      return c.json({ error: `No private signing key configured for product: ${product_id}` }, 500);
    }

    const payload: LicensePayload = {
      v: 1,
      lic: licId,
      product: product_id,
      email,
      plan,
      seats: 1,
      issued: now,
      updates_until: updatesUntil,
      expires: null,
      kid: product.license_kid || c.env.LICENSE_KID || 'v1',
    };

    const key = await signLicense(payload, productKey);

    await c.env.DB.prepare(`
      INSERT INTO licenses (
        id, customer_id, product_id, source_type, source_id,
        plan, seats, issued_at, updates_until, status, key
      ) VALUES (?, ?, ?, 'manual', 'admin_manual', ?, 1, ?, ?, 'active', ?)
    `).bind(licId, customerId, product_id, plan, now, updatesUntil, key).run();

    await writeAdminAudit(c.env, c.get('admin_email') || 'admin', 'license.issue', licId, { email, product_id });
    return c.json({ success: true, license_id: licId, key });
  });

  admin.post('/licenses/:id/resend', async (c) => {
    const id = c.req.param('id');
    const row = await c.env.DB.prepare(`
      SELECT l.key, p.name as product_name, c.email
      FROM licenses l
      JOIN products p ON l.product_id = p.id
      JOIN customers c ON l.customer_id = c.id
      WHERE l.id = ?
    `).bind(id).first<any>();

    if (!row) {
      return c.json({ error: 'License not found' }, 404);
    }

    const emailContent = renderRecoveryEmail({
      licenses: [{ productName: row.product_name, key: row.key, issuedAt: new Date().toISOString() }],
      supportEmail: c.env.EMAIL_REPLY_TO,
    });

    await sendEmail(c.env, {
      from: c.env.EMAIL_FROM,
      to: row.email,
      replyTo: c.env.EMAIL_REPLY_TO,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    await writeAdminAudit(c.env, c.get('admin_email') || 'admin', 'license.resend', id, {});
    return c.json({ success: true });
  });

  admin.post('/licenses/:id/revoke', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare(
      'UPDATE licenses SET status = "revoked", revoked_reason = "Admin revocation" WHERE id = ?'
    ).bind(id).run();
    await writeAdminAudit(c.env, c.get('admin_email') || 'admin', 'license.revoke', id, {});
    return c.json({ success: true });
  });

  admin.post('/payments/:id/refund', async (c) => {
    const paymentId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const parsed = adminRefundSchema.safeParse(body);

    const payment = await c.env.DB.prepare(`
      SELECT pay.*, p.name as product_name, p.refund_window_days, cu.email
      FROM payments pay
      JOIN products p ON p.id = pay.product_id
      JOIN customers cu ON cu.id = pay.customer_id
      WHERE pay.id = ?
    `).bind(paymentId).first<any>();
    if (!payment) return c.json({ error: 'Payment not found' }, 404);
    if (payment.status === 'refunded') return c.json({ error: 'Already refunded' }, 409);

    const windowEnd = payment.created_at + Number(payment.refund_window_days ?? 14) * 86400;
    if (Math.floor(Date.now() / 1000) > windowEnd && body?.override !== true) {
      return c.json({ error: 'Refund window has closed', window_ended_at: windowEnd }, 422);
    }

    const rzp = new RazorpayClient(c.env.RAZORPAY_KEY_ID, c.env.RAZORPAY_KEY_SECRET);
    try {
      const refund = await rzp.refundPayment(paymentId, parsed.data?.amount_paise);
      const full = refund.amount >= payment.amount_paise;
      await c.env.DB.prepare('UPDATE payments SET status = ?, refunded_paise = ? WHERE id = ?')
        .bind(full ? 'refunded' : 'partially_refunded', refund.amount, paymentId).run();

      // A full refund ends the license that this payment bought.
      if (full) {
        await c.env.DB.prepare(
          "UPDATE licenses SET status = 'revoked', revoked_reason = 'Admin refund' WHERE source_id IN (?, ?)"
        ).bind(payment.order_id ?? '', payment.subscription_id ?? '').run();
      }

      const mail = renderRefundEmail({
        productName: payment.product_name,
        amountPaise: refund.amount,
        paymentId,
        supportEmail: c.env.EMAIL_REPLY_TO,
      });
      await sendEmail(c.env, { from: c.env.EMAIL_FROM, to: payment.email, replyTo: c.env.EMAIL_REPLY_TO, ...mail });

      await writeAdminAudit(c.env, c.get('admin_email') || 'admin', 'payment.refund', paymentId, { amount: refund.amount, full });
      return c.json({ success: true, refund });
    } catch (err: any) {
      return c.json({ error: err?.message || 'Refund failed' }, 502);
    }
  });

  admin.post('/activations/:id/free', async (c) => {
    const id = c.req.param('id');
    const now = Math.floor(Date.now() / 1000);
    const res = await c.env.DB.prepare(
      'UPDATE activations SET deactivated_at = ? WHERE id = ? AND deactivated_at IS NULL'
    ).bind(now, id).run();
    if (!res.meta.changes) return c.json({ error: 'Seat not found or already free' }, 404);
    await writeAdminAudit(c.env, c.get('admin_email') || 'admin', 'seat.free', id, {});
    return c.json({ success: true });
  });

  admin.get('/customer-lookup', async (c) => {
    const email = (c.req.query('email') || '').trim().toLowerCase();
    if (!email) return c.json({ error: 'email required' }, 400);
    const customer = await c.env.DB.prepare('SELECT * FROM customers WHERE email = ?').bind(email).first<any>();
    if (!customer) return c.json({ error: 'Customer not found' }, 404);
    const [orders, licenses, payments, devices] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC').bind(customer.id).all(),
      c.env.DB.prepare(
        'SELECT l.*, p.name as product_name FROM licenses l JOIN products p ON p.id = l.product_id WHERE l.customer_id = ? ORDER BY l.issued_at DESC'
      ).bind(customer.id).all(),
      c.env.DB.prepare('SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC').bind(customer.id).all(),
      c.env.DB.prepare(
        `SELECT a.* FROM activations a JOIN licenses l ON l.id = a.license_id
         WHERE l.customer_id = ? AND a.deactivated_at IS NULL ORDER BY a.last_seen_at DESC`
      ).bind(customer.id).all(),
    ]);
    return c.json({
      customer, orders: orders.results, licenses: licenses.results,
      payments: payments.results, devices: devices.results,
    });
  });

  admin.get('/product-sales', async (c) => {
    const rows = await c.env.DB.prepare(`
      SELECT p.id, p.name,
        COALESCE(SUM(CASE WHEN pay.status IN ('captured','partially_refunded') THEN pay.amount_paise END), 0) as gross_paise,
        COALESCE(SUM(pay.refunded_paise), 0) as refunded_paise,
        COUNT(pay.id) as payments
      FROM products p LEFT JOIN payments pay ON pay.product_id = p.id
      GROUP BY p.id ORDER BY gross_paise DESC
    `).all();
    return c.json({ products: rows.results });
  });

  admin.get('/audit', async (c) => {
    const rows = await c.env.DB.prepare('SELECT * FROM admin_audit ORDER BY at DESC LIMIT 200').all();
    return c.json({ audit: rows.results });
  });

  admin.get('/export.csv', async (c) => {
    const table = c.req.query('table') || 'payments';
    let rows: any[] = [];
    if (table === 'payments') {
      const r = await c.env.DB.prepare('SELECT * FROM payments ORDER BY created_at DESC LIMIT 5000').all<any>();
      rows = r.results;
    } else if (table === 'licenses') {
      const r = await c.env.DB.prepare('SELECT * FROM licenses ORDER BY issued_at DESC LIMIT 5000').all<any>();
      rows = r.results;
    } else {
      const r = await c.env.DB.prepare('SELECT * FROM customers ORDER BY created_at DESC LIMIT 5000').all<any>();
      rows = r.results;
    }

    if (rows.length === 0) {
      return new Response('empty', { headers: { 'Content-Type': 'text/csv' } });
    }

    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
    }
    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${table}-export.csv"`,
      },
    });
  });

  return admin;
}
