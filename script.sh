#!/usr/bin/env bash
# One-shot go-live: backup -> sync remote schema -> seed -> secrets -> build -> deploy.
# Safe to re-run. Asks before every change to production. Run from the repo root: ./script.sh
set -euo pipefail
cd "$(dirname "$0")"

DB=storefront-db
W="npx wrangler"
TMP=$(mktemp -d)
confirm() { read -r -p "$1 [y/N] " a; [[ "$a" == y || "$a" == Y ]] || { echo "Stopped."; exit 1; }; }

echo "== 0. Checks"
command -v python3 >/dev/null && command -v sqlite3 >/dev/null || { echo "python3 and sqlite3 are required"; exit 1; }
$W whoami 2>&1 | grep -qi "logged in\|account" || { echo "Run: npx wrangler login"; exit 1; }
[[ -f .env.local ]] && grep -q '^VITE_CLERK_PUBLISHABLE_KEY=' .env.local || { echo ".env.local needs VITE_CLERK_PUBLISHABLE_KEY (needed at build time)"; exit 1; }

echo "== 1. Backup production database"
mkdir -p backups
BACKUP="backups/${DB}-$(date +%Y%m%d-%H%M%S).sql"
$W d1 export $DB --remote --output "$BACKUP" >/dev/null
echo "Saved $BACKUP (gitignored; keep it safe)"
grep -qx 'backups/' .gitignore 2>/dev/null || echo 'backups/' >> .gitignore

echo "== 2. Sync remote schema with migrations/ (adds only what is missing, never drops)"
$W d1 execute $DB --remote --json --command \
  "select name, sql from sqlite_master where type in ('table','index') and name not like '_cf%' and name not like 'sqlite%'" > "$TMP/master.json"
python3 - "$TMP" <<'PY'
import glob, json, re, sqlite3, subprocess, sys
tmp = sys.argv[1]

ref = sqlite3.connect(":memory:")
for f in sorted(glob.glob("migrations/*.sql")):
    ref.executescript(open(f).read())

remote = json.load(open(f"{tmp}/master.json"))[0]["results"]
rtables = {r["name"] for r in remote if r["sql"] and r["sql"].startswith("CREATE TABLE")}
rindexes = {r["name"] for r in remote if r["sql"] and "INDEX" in r["sql"].upper().split("(")[0]}

def remote_cols(t):
    out = subprocess.run(["npx", "wrangler", "d1", "execute", "storefront-db", "--remote", "--json",
                          "--command", f"select name from pragma_table_info('{t}')"],
                         capture_output=True, text=True, check=True).stdout
    return {r["name"] for r in json.loads(out)[0]["results"]}

stmts = []
for name, sql in ref.execute("select name, sql from sqlite_master where type='table' and name not like 'sqlite%' and name not like '_cf%'"):
    if name not in rtables:
        stmts.append(sql.rstrip(";") + ";")
        continue
    have = remote_cols(name)
    for _, col, typ, notnull, dflt, pk in ref.execute(f"pragma table_info('{name}')"):
        if col in have:
            continue
        d = f" DEFAULT {dflt}" if dflt is not None else ""
        nn = " NOT NULL" if notnull and dflt is not None else ""  # SQLite cannot add NOT NULL without a default
        stmts.append(f"ALTER TABLE {name} ADD COLUMN {col} {typ}{nn}{d};")
for name, sql in ref.execute("select name, sql from sqlite_master where type='index' and sql is not null"):
    if name not in rindexes:
        stmts.append(re.sub(r"^CREATE (UNIQUE )?INDEX (IF NOT EXISTS )?", r"CREATE \1INDEX IF NOT EXISTS ", sql).rstrip(";") + ";")

open(f"{tmp}/sync.sql", "w").write("\n".join(stmts) + ("\n" if stmts else ""))
print(f"{len(stmts)} change(s) needed")
PY
if [[ -s "$TMP/sync.sql" ]]; then
  cat "$TMP/sync.sql"
  confirm "Apply these to PRODUCTION?"
  $W d1 execute $DB --remote --yes --file "$TMP/sync.sql"
else
  echo "Schema already up to date."
fi
# Mark all migrations as applied so wrangler never replays them over the synced schema.
$W d1 execute $DB --remote --yes --command \
  "insert or ignore into d1_migrations(name) values ('0001_init.sql'),('0002_admin_login.sql'),('0003_activations.sql'),('0004_unique_order_license.sql'),('0005_customer_clerk_id.sql')" >/dev/null

echo "== 3. Seed products (upsert: updates names, prices, links; keeps orders and landing_url/allowed_origins)"
confirm "Seed PRODUCTION products (this overwrites price and description with seed/products.sql)?"
$W d1 execute $DB --remote --yes --file seed/products.sql

echo "== 4. Secrets (values are typed here and never echoed; Enter on an empty line to skip one already set)"
put_secret() {
  read -r -s -p "$1 (blank = keep current): " v; echo
  if [[ -n "$v" ]]; then printf '%s' "$v" | $W secret put "$1" >/dev/null && echo "  $1 set"; else echo "  $1 kept"; fi
}
if confirm "Set or update secrets now?"; then
  put_secret RAZORPAY_KEY_ID
  put_secret RAZORPAY_KEY_SECRET
  put_secret RAZORPAY_WEBHOOK_SECRET
  put_secret BREVO_API_KEY
  put_secret LICENSE_KEY   # shared signing key for all products (pnpm keygen, no argument)
  read -r -p "Generate a random ORDER_TOKEN_SECRET and set it? (only the first time; changing it breaks open order links) [y/N] " g
  [[ "$g" == y ]] && openssl rand -hex 32 | $W secret put ORDER_TOKEN_SECRET >/dev/null && echo "  ORDER_TOKEN_SECRET ok"
fi

echo "== 5. Build and deploy"
pnpm test
pnpm build
confirm "Deploy to https://storefront.just-a-dev.workers.dev (replaces the live site)?"
$W deploy

echo
echo "== Done. Still manual:"
echo " - Clerk dashboard -> Sessions -> Customize session token: {\"email\":\"{{user.primary_email_address}}\",\"email_verified\":\"{{user.email_verified}}\"}"
echo " - Razorpay dashboard -> Webhooks -> <site>/api/webhooks/razorpay (payment.captured, order.paid, refund.processed), same secret as RAZORPAY_WEBHOOK_SECRET"
echo " - Brevo: verify sender risha2621@gmail.com"
echo " - Per product: set landing_url and allowed_origins, e.g.:"
echo "   npx wrangler d1 execute $DB --remote --command \"update products set landing_url='https://<capturita-landing>', allowed_origins='https://<capturita-landing>' where id='capturita'\""
echo " - Put the public half of the Capturita signing key (pnpm keygen capturita) in the desktop app; back both halves up"
