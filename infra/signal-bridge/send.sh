#!/usr/bin/env bash
# Local bridge drill: POST a test message to the Barnaby bridge.
# Usage: SIGNAL_BRIDGE_TOKEN=... ./send.sh "hello" [https://link]
# Defaults to the localhost bridge (run on Barnaby itself).
set -euo pipefail

BRIDGE_URL="${SIGNAL_BRIDGE_URL:-http://127.0.0.1:8765}"
if [[ -z "${SIGNAL_BRIDGE_TOKEN:-}" && -f /opt/signal-bridge/bridge.env ]]; then
  # shellcheck disable=SC1091
  source /opt/signal-bridge/bridge.env
fi
if [[ -z "${SIGNAL_BRIDGE_TOKEN:-}" ]]; then
  echo "SIGNAL_BRIDGE_TOKEN is not set (and no /opt/signal-bridge/bridge.env)" >&2
  exit 1
fi

MESSAGE="${1:-bridge test}"
LINK="${2:-}"
if [[ -n "${LINK}" ]]; then
  PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"message": sys.argv[1], "url": sys.argv[2]}))' "${MESSAGE}" "${LINK}")"
else
  PAYLOAD="$(python3 -c 'import json,sys; print(json.dumps({"message": sys.argv[1]}))' "${MESSAGE}")"
fi

curl -sf -X POST "${BRIDGE_URL}/api/signal/send" \
  -H "Authorization: Bearer ${SIGNAL_BRIDGE_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d "${PAYLOAD}"
echo
