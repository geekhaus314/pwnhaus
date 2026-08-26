# pwn4g3 site backend

This Cloudflare Worker is the deployable edge boundary for backend components:

- `GET /health` reports Worker and R2 health.
- `GET /api/components` describes the Rust, Go, and Ruby service contracts.
- `GET /assets/<key>` serves immutable project assets from R2.

One-time Cloudflare setup:

```sh
npx wrangler r2 bucket create pwn4g3-portfolio-assets
npx wrangler deploy --config workers/site-backend/wrangler.jsonc --env production
```

The GitHub Actions workflow deploys the Worker and syncs `public/projects/` after
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are added as repository secrets.

