// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // Update these two once you know your GitHub Pages repo name,
  // same pattern your old project used.
  site: 'https://yourusername.github.io',
  base: '/your-repo-name/',
  integrations: [react()],
});
