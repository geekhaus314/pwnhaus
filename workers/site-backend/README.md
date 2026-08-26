# pwn4g3 site backend

This Cloudflare Worker is the deployable edge boundary for backend components.
It runs without paid services or billing verification:

- `GET /health` reports Worker health.
- `GET /api/components` describes the Rust, Go, and Ruby service contracts.

R2 asset storage is intentionally optional because Cloudflare requires billing
verification to enable R2. The static portfolio continues to serve snapshots
from GitHub Pages.
