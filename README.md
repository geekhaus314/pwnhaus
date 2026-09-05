# pwnhaus — pwn4g3 portfolio

Personal portfolio and engineering showcase for Jake Viefhaus ([@geekhaus314](https://github.com/geekhaus314)) — deployed at [pwn4g3.pages.dev](https://pwn4g3.pages.dev).

## Stack

- **SvelteKit** — framework, routing, SSR/SSG
- **Svelte 5** — components with runes (`$state`, `$derived`, `$props`)
- **@sveltejs/adapter-cloudflare** — Cloudflare Pages deployment
- **TypeScript** — throughout
- **Cloudflare Worker** (`workers/site-backend`) — `/health`, `/api/components`, `/api/viper-web3`

## Commands

```sh
npm install
npm run dev        # dev server
npm run build      # production build → .svelte-kit/cloudflare/
npm run preview    # preview production build locally
npm run check      # svelte-check + TypeScript
```

## Project structure

```
src/
  app.html                  # HTML template with SEO meta + JSON-LD
  app.css                   # Global design system (4 themes: nocturne, matrix, cyan, paper)
  routes/
    +layout.svelte          # Nav, footer, scroll-spy, reveal observer, pointer tracking
    +page.svelte            # Main page (Hero, About, Portfolio, Career, Booking)
    api/booking/+server.ts  # Booking form API endpoint
  lib/
    components/             # Svelte components
      Terminal.svelte       # Interactive CLI terminal with theme/whoami/help commands
      HeroCanvas.svelte     # Canvas crosshair + particle effect
      Signal.svelte         # Edge signal toggle
      ThemeSwitcher.svelte  # Nocturne / Matrix / Cyan / Paper switcher
      ProjectCard.svelte    # Portfolio card
      ProjectModal.svelte   # Fullscreen project lightbox (native <dialog>)
      GitHubStats.svelte    # Live GitHub repo stats
      BookingForm.svelte    # Contact/booking form
    data/
      profile.ts            # Bio, capabilities, stack, booking services
      projects.ts           # Full project list with images and detail
      themes.ts             # Theme definitions (CSS variables)
    stores/
      theme.ts              # Reactive theme store

workers/
  site-backend/             # Cloudflare Worker (deployed separately)
    src/index.ts            # /health, /api/components, /api/viper-web3

public/                     # Static assets (images, resume, favicon, etc.)
apps/                       # Isolated lab apps (next-lab, nuxt-lab, services)
```

## Themes

The design system ships four themes toggled via the nav bar:

| Name | Palette |
|------|---------|
| **Nocturne** (default) | Deep graphite + signal crimson |
| **Matrix** | Phosphor green + black glass |
| **Cyan Field** | Cold blue + technical glass |
| **Paper** | Warm off-white + ink black |

## Deployment

### Frontend (Cloudflare Pages)

GitHub Actions builds on push to `main` and deploys via:

```sh
npx wrangler pages deploy .svelte-kit/cloudflare --project-name pwn4g3 --branch main
```

Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`

### Backend Worker

```sh
npx wrangler deploy --config workers/site-backend/wrangler.jsonc --env production
```

Deployed separately via `.github/workflows/deploy-cloudflare-backend.yml`.

## Terminal commands

The interactive CLI in the hero section supports:

```
whoami / about   identity, role, location
work             focus areas
skills           engineering capabilities
stack            frameworks and languages
contact          email + GitHub
themes           list available themes
theme <name>     switch visual theme
clear            reset terminal
help             show all commands
```
