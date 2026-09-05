# React Showcase Microfrontend

A React 19 microfrontend showcasing modern React patterns and capabilities.

## Features

- ✅ React 19 with Server Components
- ✅ TypeScript for type safety
- ✅ Module Federation remote entry
- ✅ Dark/Light theme toggle
- ✅ Responsive component showcase
- ✅ Custom hooks demonstration
- ✅ Suspense & Error Boundaries
- ✅ Performance optimizations

## Development

```bash
cd apps/react-showcase
npm install
npm run dev
```

Available at `http://localhost:5174`

## Production

Built and deployed independently via Cloudflare Pages.

```bash
npm run build
```

Output: `dist/remoteEntry.js` (Module Federation remote)
