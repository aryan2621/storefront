import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getPlatformProxy } from 'wrangler';

/** An in-memory local D1 with the real migrations applied, so tests hit real SQLite behaviour. */
export async function createTestDb() {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ persist: false });
  const dir = join(__dirname, '../../migrations');
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(join(dir, file), 'utf8').replace(/--.*$/gm, '');
    // prepare() takes one statement at a time, so split on ";" at statement ends.
    for (const stmt of sql.split(/;\s*\n/).map((x) => x.trim()).filter(Boolean)) {
      await proxy.env.DB.prepare(stmt).run();
    }
  }
  return { db: proxy.env.DB, dispose: () => proxy.dispose() };
}
