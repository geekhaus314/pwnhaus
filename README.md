# pwn4g3 engineering portfolio

The public portfolio is an Astro static site with deliberately compartmentalized interactive surfaces:

- **Astro** owns routing, content, SEO, and static delivery.
- **React** owns the framework architecture matrix.
- **Vue** owns the deployment-boundary matrix.
- **Solid** owns the live system status control.
- **Svelte** owns the edge-signal control.
- **Vite** powers Astro's development and production bundling.
- **Node.js** is the service/runtime boundary represented by the architecture matrix.
- `apps/next-lab` and `apps/nuxt-lab` are isolated application labs for framework-specific product surfaces.

## Commands

```sh
npm install
npm run dev
npm run build
```

Run an application lab from its directory:

```sh
npm --workspace @pwn4g3/next-lab run dev
npm --workspace @pwn4g3/nuxt-lab run dev
```

## Cloudflare backend

The site backend Worker and R2 asset bucket live under `workers/site-backend`.
Create the bucket once, then deploy the Worker:

```sh
npx wrangler r2 bucket create pwn4g3-portfolio-assets
npx wrangler deploy --config workers/site-backend/wrangler.jsonc --env production
```

GitHub Actions can deploy both the Worker and `public/projects` assets when
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are configured as repository secrets.
