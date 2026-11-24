#!/usr/bin/env bash
# Report update progress to the client's admin dashboard (HMAC-SHA256 signed).
#
# Usage: report.sh <status> <step> [message]
#   status: running | success | failed | needs_review
#
# Env: CALLBACK_URL, UPDATE_ID, SITEKIT_DEPLOY_SECRET, RUN_URL
# Never fails the workflow: if the dashboard is unreachable the update continues.
set -uo pipefail

STATUS="${1:?status required}"
STEP="${2:?step required}"
MESSAGE="${3:-}"

if [ -z "${CALLBACK_URL:-}" ] || [ -z "${UPDATE_ID:-}" ] || [ -z "${SITEKIT_DEPLOY_SECRET:-}" ]; then
  echo "[report] skipped (no callback configured): $STATUS / $STEP / $MESSAGE"
  exit 0
fi

BODY="$(jq -cn \
  --argjson update_id "$UPDATE_ID" \
  --arg status "$STATUS" \
  --arg step "$STEP" \
  --arg message "$MESSAGE" \
  --arg run_url "${RUN_URL:-}" \
  '{update_id: $update_id, status: $status, step: $step, message: $message} + (if $run_url == "" then {} else {run_url: $run_url} end)')"

SIGNATURE="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SITEKIT_DEPLOY_SECRET" | sed 's/^.* //')"

HTTP_STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$CALLBACK_URL" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H "X-Sitekit-Signature: $SIGNATURE" \
  -d "$BODY" || echo 000)"

echo "[report] $STATUS / $STEP → HTTP $HTTP_STATUS"
exit 0
