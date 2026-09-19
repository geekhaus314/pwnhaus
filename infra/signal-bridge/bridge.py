#!/usr/bin/env python3
"""pwn4g3 signal bridge (#42): localhost HTTP -> `signal-cli send`.

Stdlib only (no deps). Listens on 127.0.0.1:8765; expose publicly ONLY via
a cloudflared tunnel (the notify worker calls SIGNAL_BRIDGE_URL with the
SIGNAL_BRIDGE_TOKEN bearer). Recipients are allowlisted from config.json —
unknown numbers are rejected before signal-cli ever runs.

  POST /api/signal/send   { "message": str, "url"?: str }
  GET  /api/signal/status (no secrets, no message content)
"""

import hmac
import json
import os
import re
import shutil
import subprocess
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE, "config.json")

MAX_BODY_BYTES = 16 * 1024


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    sender = str(cfg.get("sender", "")).strip()
    recipients = [str(r).strip() for r in cfg.get("recipients", []) if str(r).strip()]
    rate = cfg.get("rate", {}) or {}
    return {
        "sender": sender,
        "recipients": recipients,
        "per_min": int(rate.get("per_min", 5)),
        "max_len": int(rate.get("max_len", 1500)),
    }


def e164(value):
    return bool(re.fullmatch(r"\+[1-9][0-9]{6,14}", value.strip()))


_hits = []


def rate_ok(per_min):
    now = time.time()
    cutoff = now - 60.0
    global _hits
    _hits = [t for t in _hits if t > cutoff]
    if len(_hits) >= per_min:
        return False
    _hits.append(now)
    return True


def expected_token():
    return os.environ.get("SIGNAL_BRIDGE_TOKEN", "")


class Handler(BaseHTTPRequestHandler):
    server_version = "pwn4g3-signal-bridge/1.0"

    def log_message(self, *args):  # keep systemd logs to our own JSON lines
        pass

    def _send(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/api/signal/status":
            cfg = load_config()
            self._send(200, {
                "ok": True,
                "data": {
                    "service": "signal-bridge",
                    "sender_set": cfg["sender"] not in ("", "+10000000000"),
                    "recipients": len(cfg["recipients"]),
                    "signal_cli": shutil.which("signal-cli") is not None,
                },
            })
            return
        self._send(404, {"ok": False, "error": "not_found"})

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path != "/api/signal/send":
            self._send(404, {"ok": False, "error": "not_found"})
            return

        token = expected_token()
        if not token:
            self._send(503, {"ok": False, "error": "bridge_not_configured"})
            return
        auth = self.headers.get("Authorization", "")
        m = re.fullmatch(r"Bearer (.+)", auth.strip())
        provided = m.group(1).strip() if m else ""
        if not provided or not hmac.compare_digest(provided, token):
            self._send(403, {"ok": False, "error": "bad_token"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY_BYTES:
            self._send(413 if length > MAX_BODY_BYTES else 400, {"ok": False, "error": "bad_length"})
            return
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception:
            self._send(400, {"ok": False, "error": "invalid_json"})
            return

        cfg = load_config()
        if not e164(cfg["sender"]) or not cfg["recipients"] or not all(e164(r) for r in cfg["recipients"]):
            self._send(503, {"ok": False, "error": "bridge_not_configured"})
            return
        message = body.get("message")
        if not isinstance(message, str) or not message.strip() or len(message) > cfg["max_len"]:
            self._send(422, {"ok": False, "error": "message_string_required"})
            return
        link = body.get("url")
        if link not in (None, "",):
            if not isinstance(link, str) or len(link) > 2048 or not link.startswith("https://"):
                self._send(422, {"ok": False, "error": "url_must_be_https_string"})
                return
        else:
            link = None
        if not rate_ok(cfg["per_min"]):
            self._send(429, {"ok": False, "error": "rate_limited"})
            return
        if shutil.which("signal-cli") is None:
            self._send(503, {"ok": False, "error": "signal_cli_missing"})
            return

        text = f"{message.strip()}\n{link}" if link else message.strip()
        try:
            proc = subprocess.run(
                ["signal-cli", "-u", cfg["sender"], "send", "-m", text, *cfg["recipients"]],
                capture_output=True, text=True, timeout=30,
            )
        except subprocess.TimeoutExpired:
            print(json.dumps({"msg": "signal_send_timeout", "recipients": len(cfg["recipients"])}), flush=True)
            self._send(502, {"ok": False, "error": "signal_timeout"})
            return
        if proc.returncode != 0:
            print(json.dumps({"msg": "signal_send_failed", "rc": proc.returncode, "stderr": proc.stderr[-300:]}), flush=True)
            self._send(502, {"ok": False, "error": "signal_send_failed"})
            return
        print(json.dumps({"msg": "signal_sent", "recipients": len(cfg["recipients"])}), flush=True)
        self._send(200, {"ok": True, "data": {"sent": len(cfg["recipients"])}})


if __name__ == "__main__":
    print(json.dumps({"msg": "signal_bridge_listen", "addr": "127.0.0.1:8765"}), flush=True)
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
