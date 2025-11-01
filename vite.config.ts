import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			srcDir: './src',
			mode: 'development',
			scope: '/',
			base: '/',
			selfDestroying: process.env.SELF_DESTROYING_SW === 'true',
			manifest: {
				short_name: 'ShiftHappens',
				name: 'ShiftHappens - Schedule Management',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				theme_color: '#0ea5e9',
				background_color: '#ffffff',
				description: 'Restaurant shift scheduling made simple',
				icons: [
					{
						src: '/icon-192.png',
						type: 'image/png',
						sizes: '192x192',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512.png',
						type: 'image/png',
						sizes: '512x512',
						purpose: 'any maskable'
					}
				]
			},
			injectManifest: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}']
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				cleanupOutdatedCaches: true,
				clientsClaim: true
			},
			devOptions: {
				enabled: true,
				suppressWarnings: process.env.SUPPRESS_WARNING === 'true',
				type: 'module',
				navigateFallback: '/'
			},
			// if you have shared info in svelte config file put in a separate module and use it also here
			kit: {}
		})
	]
});
