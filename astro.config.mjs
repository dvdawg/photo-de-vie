import { defineConfig } from 'astro/config';

import tailwind from '@astrojs/tailwind';

import studio from './studio/integration.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://photo.dvdkm.cc',
  // `applyBaseStyles: false` skips Tailwind's Preflight reset — the existing
  // components lean on default UA styles, so injecting Preflight would restyle
  // the whole site. Utilities still work without it.
  // `studio()` is inert unless the command is `dev` — it adds the authoring
  // dashboard at /studio, which never reaches a build. See studio/integration.mjs.
  integrations: [tailwind({ applyBaseStyles: false }), studio()],
});