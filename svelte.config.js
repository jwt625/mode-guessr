import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		paths: {
			// Deployed as a project page at https://outside5sigma.com/mode-guessr
			base: process.env.NODE_ENV === 'production' ? '/mode-guessr' : ''
		},
		alias: {
			$foundation: 'src'
		}
	}
};

export default config;
