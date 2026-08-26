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

## Cloudflare deployment

The primary frontend target is `https://pwnhaus.pages.dev`. GitHub is used for
source control; Cloudflare Pages serves the Astro build:

```sh
npm run build
npx wrangler pages deploy dist --project-name pwnhaus --branch main
```

GitHub Actions deploys the Pages site and Worker when
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are configured as repository secrets.

The backend Worker lives under `workers/site-backend` and does not require R2 or
billing verification. R2 remains an optional future asset store.
