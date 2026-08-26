# pwn4g3 site backend

This Cloudflare Worker is the deployable edge boundary for backend components.
It runs without paid services or billing verification:

- `GET /health` reports Worker health.
- `GET /api/components` describes the Rust, Go, and Ruby service contracts.
- `GET /api/viper-web3` exposes the Solidity audit service manifest.
- `POST /api/viper-web3/analyze` accepts `{ "source": "..." }` and returns bounded,
  heuristic Solidity triage findings.

R2 asset storage is intentionally optional because Cloudflare requires billing
verification to enable R2. The static portfolio continues to serve snapshots
from GitHub Pages.

The Viper-Web3 endpoint is chain-agnostic and read-only. It does not deploy
contracts, access wallets, hold keys, or replace Foundry, Slither, Mythril, or
human review.
