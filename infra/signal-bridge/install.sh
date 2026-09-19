#!/usr/bin/env bash
# pwn4g3 signal bridge installer for Barnaby (#42). Run as root.
# Installs signal-cli + the stdlib bridge, wires systemd, prints the
# human-gated steps (number registration/verification CANNOT be automated).
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST=/opt/signal-bridge

if [[ "${EUID}" -ne 0 ]]; then
  echo "run as root: sudo $0" >&2
  exit 1
fi

echo "[1/5] installing signal-cli..."
if ! command -v signal-cli >/dev/null 2>&1; then
  apt-get update
  apt-get install -y signal-cli
fi
signal-cli --version

echo "[2/5] creating signalbridge user + dirs..."
id -u signalbridge >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin signalbridge
mkdir -p "${DEST}"
cp "${SRC_DIR}/bridge.py" "${SRC_DIR}/config.json" "${DEST}/"
chmod 755 "${DEST}/bridge.py"
chmod 640 "${DEST}/config.json"
chown -R signalbridge:signalbridge "${DEST}"

echo "[3/5] bridge env (token)..."
if [[ ! -f "${DEST}/bridge.env" ]]; then
  TOKEN="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48)"
  printf 'SIGNAL_BRIDGE_TOKEN=%s\n' "${TOKEN}" > "${DEST}/bridge.env"
  chmod 600 "${DEST}/bridge.env"
  chown signalbridge:signalbridge "${DEST}/bridge.env"
  echo "  minted SIGNAL_BRIDGE_TOKEN (stored in ${DEST}/bridge.env — copy it to Cloudflare as the notify worker secret of the same name)"
else
  echo "  bridge.env already exists — leaving it alone (rotate manually if needed)"
fi

echo "[4/5] installing systemd unit..."
cp "${SRC_DIR}/signal-bridge.service" /etc/systemd/system/signal-bridge.service
systemctl daemon-reload
systemctl enable --now signal-bridge
sleep 1
systemctl --no-pager status signal-bridge || true

echo "[5/5] human steps (cannot be automated):"
cat <<'EOF'
  1. Register the sender number (SMS/voice verification goes to YOUR phone):
       sudo -u signalbridge signal-cli -u +YOUR_NUMBER register --voice
     then verify:
       sudo -u signalbridge signal-cli -u +YOUR_NUMBER verify <CODE>
  2. Edit /opt/signal-bridge/config.json: set sender + recipients to real E.164 numbers.
  3. Restart: systemctl restart signal-bridge
  4. Test locally: SIGNAL_BRIDGE_TOKEN=$(cut -d= -f2 /opt/signal-bridge/bridge.env) ./send.sh "bridge test"
  5. Expose via cloudflared tunnel (DO NOT bind 0.0.0.0):
       cloudflared tunnel --url http://127.0.0.1:8765
     then set Cloudflare Worker secrets on pwn4g3-notify:
       npx wrangler secret put SIGNAL_BRIDGE_URL    # https://<tunnel-hostname>
       npx wrangler secret put SIGNAL_BRIDGE_TOKEN  # same value as bridge.env
EOF
