# Signal bridge kit (#42)

Barnaby-hosted forwarder: the Cloudflare `pwn4g3-notify` worker POSTs admin
broadcasts here, the bridge shells out to `signal-cli send`. Signal has no
server-side bot API, so a persistent host process is the only honest design —
this kit keeps it small, stdlib-only, and fail-closed.

## Files

| File | What |
|------|------|
| `config.json` | listen addr, sender + recipient allowlist, rate budget. No secrets. |
| `bridge.py` | stdlib HTTP server: `POST /api/signal/send`, `GET /api/signal/status`. |
| `signal-bridge.service` | systemd unit (hardened, runs as `signalbridge`). |
| `install.sh` | Barnaby installer (root): signal-cli, user, unit, token mint. |
| `send.sh` | local drill script. |

## Bring-up (human-gated)

1. `sudo ./install.sh` on Barnaby.
2. Register/verify the sender number with `signal-cli` (SMS/voice to your phone — cannot be automated, installer prints the commands).
3. Fill `sender` + `recipients` in `/opt/signal-bridge/config.json`, restart the unit.
4. `./send.sh "bridge test"` locally, then expose via `cloudflared tunnel --url http://127.0.0.1:8765`.
5. Bind Worker secrets on `pwn4g3-notify`:
   - `SIGNAL_BRIDGE_URL` = tunnel hostname (https)
   - `SIGNAL_BRIDGE_TOKEN` = value from `/opt/signal-bridge/bridge.env`

## Notify adapter contract

`POST {SIGNAL_BRIDGE_URL}/api/signal/send` with `Authorization: Bearer <token>`:

```json
{ "message": "Release is live", "url": "https://pwn4g3.pages.dev/" }
```

- `200 {ok:true}` → ledger `sent`
- `429/5xx` → ledger `failed` (retryable later)
- other `4xx` → ledger `failed` (rejected)
- unreachable / unconfigured → ledger `skipped/signal_bridge_not_configured` (no spam window, no throw)

Until the tunnel + secrets land, the notify worker records
`skipped/signal_bridge_not_configured` — same posture as the pre-#42 stub.
