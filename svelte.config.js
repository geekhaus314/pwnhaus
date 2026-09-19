import cloudflare from '@sveltejs/adapter-cloudflare';
import vercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Dual-target build (#52): Cloudflare Pages stays the default.
// Set ADAPTER=vercel for the Vercel mirror (see vercel.json buildCommand).
const useVercel = process.env.ADAPTER === 'vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: useVercel
			? vercel({ runtime: 'nodejs22.x' })
			: cloudflare({
					routes: {
						include: ['/*'],
						exclude: ['<all>']
					}
				}),
		alias: {
			'$lib': './src/lib',
			'$components': './src/lib/components',
			'$data': './src/lib/data'
		}
	}
};

export default config;
