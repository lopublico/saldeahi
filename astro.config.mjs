// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import { readmeDev } from '@lopublico/ui/readme-dev.js';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://saldeahi.lopublico.es',
  integrations: [preact({ compat: true }), readmeDev()],

  vite: {
    plugins: [tailwindcss()],
    // Con @lopublico/ui enlazado en local (file:../ui), las fuentes e iconos viven fuera del proyecto: permite leerlos en dev
    server: { fs: { allow: ['..'] } },
  }
});