import { Env } from './types';

export async function writeAdminAudit(
  env: Env,
  actorEmail: string,
  action: string,
  target: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const id = `aud_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    'INSERT INTO admin_audit (id, actor_email, action, target, details, at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(id, actorEmail, action, target, JSON.stringify(details), now)
    .run();
}
