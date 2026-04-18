#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# LinkedBoost AI — Cloudflare Pages Deploy Script
# Usage: bash scripts/deploy.sh [prod|preview]
# ─────────────────────────────────────────────────────────────────────────────
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEV_VARS="$ROOT/.dev.vars"
DEPLOY_ENV="${1:-prod}"
PROJECT_NAME="linkedboost-ai"

echo "═══════════════════════════════════════════════"
echo "  LinkedBoost AI — Cloudflare Pages Deploy"
echo "  Environment : $DEPLOY_ENV"
echo "  Project     : $PROJECT_NAME"
echo "═══════════════════════════════════════════════"

# ── Load .dev.vars ────────────────────────────────
if [ -f "$DEV_VARS" ]; then
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    export "$line"
  done < "$DEV_VARS"
  echo "✅  Loaded credentials from .dev.vars"
else
  echo "⚠️   .dev.vars not found — using existing env vars"
fi

# ── Validate Cloudflare creds ─────────────────────
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  echo "❌  CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID missing"
  echo "    Add them to .dev.vars and retry."
  exit 1
fi

echo "🔑  Account ID : $CLOUDFLARE_ACCOUNT_ID"

# ── Build ─────────────────────────────────────────
echo ""
echo "📦  Building..."
cd "$ROOT"
npm run build
echo "✅  Build complete → dist/"

# ── Create project if needed ──────────────────────
echo ""
echo "🌐  Ensuring Pages project exists..."
npx wrangler pages project create "$PROJECT_NAME" \
  --production-branch main \
  --compatibility-date 2024-01-01 2>/dev/null || true

# ── Deploy ────────────────────────────────────────
echo ""
echo "🚀  Deploying to Cloudflare Pages ($DEPLOY_ENV)..."
if [ "$DEPLOY_ENV" = "prod" ]; then
  npx wrangler pages deploy dist \
    --project-name "$PROJECT_NAME" \
    --branch main \
    --commit-dirty=true
else
  npx wrangler pages deploy dist \
    --project-name "$PROJECT_NAME" \
    --branch preview \
    --commit-dirty=true
fi

# ── Set production secrets ────────────────────────
echo ""
echo "🔒  Syncing production secrets..."

set_secret() {
  local name="$1"
  local value="$2"
  if [ -n "$value" ]; then
    echo "$value" | npx wrangler pages secret put "$name" \
      --project-name "$PROJECT_NAME" 2>/dev/null && \
      echo "    ✅  $name" || \
      echo "    ⚠️   $name (skipped — may need Pages dashboard)"
  fi
}

set_secret "GROQ_API_KEY"          "$GROQ_API_KEY"
set_secret "TWILIO_ACCOUNT_SID"    "$TWILIO_ACCOUNT_SID"
set_secret "TWILIO_AUTH_TOKEN"     "$TWILIO_AUTH_TOKEN"
set_secret "TWILIO_SERVICE_SID"    "$TWILIO_SERVICE_SID"
set_secret "SMTP_EMAIL"            "$SMTP_EMAIL"
set_secret "SMTP_PASSWORD"         "$SMTP_PASSWORD"
set_secret "JWT_SECRET"            "$JWT_SECRET"
set_secret "RAZORPAY_KEY_ID"       "$RAZORPAY_KEY_ID"
set_secret "RAZORPAY_KEY_SECRET"   "$RAZORPAY_KEY_SECRET"

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅  Deploy complete!"
echo "  🌍  https://$PROJECT_NAME.pages.dev"
echo "  🌍  https://main.$PROJECT_NAME.pages.dev"
echo "═══════════════════════════════════════════════"
