import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		'import.meta.env.VITE_GIT_SHA': JSON.stringify(process.env.VITE_GIT_SHA || ''),
		'import.meta.env.VITE_BUILD_TIME': JSON.stringify(process.env.VITE_BUILD_TIME || '')
	},
	build: {
		target: 'es2022',
		outDir: '.svelte-kit/vite',
		assetsInlineLimit: 4096,
		cssCodeSplit: true,
		sourcemap: false
	}
});
