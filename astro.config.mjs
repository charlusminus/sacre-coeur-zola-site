// Démonstration sur GitHub Pages (https://charlusminus.github.io/sacre-coeur-zola-site/).
// Au passage sur le domaine de l'école : SITE=https://sacrecoeurzola.fr BASE_PATH=/
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE ?? 'https://charlusminus.github.io',
  base: process.env.BASE_PATH ?? '/sacre-coeur-zola-site/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  image: { responsiveStyles: false },
  cacheDir: './.cache-astro',
});
