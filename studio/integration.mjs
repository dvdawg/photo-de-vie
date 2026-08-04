/**
 * The studio — a photo-authoring dashboard that exists only while
 * `astro dev` is running.
 *
 * Both halves are gated on `command === 'dev'`: the `/studio` route is simply
 * never injected for a build, and a Vite `configureServer` hook has no
 * build-time counterpart. Nothing here can reach `dist/`.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleStudio, STUDIO_PREFIX } from './server/routes.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export default function studio() {
  return {
    name: 'photo-de-vie:studio',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, updateConfig, addWatchFile, logger }) => {
        if (command !== 'dev') return;

        injectRoute({ pattern: '/studio', entrypoint: join(here, 'pages/studio.astro') });
        updateConfig({ vite: { plugins: [studioApiPlugin()] } });

        // The server half is imported once into the dev server's own process,
        // so Vite's HMR cannot reach it. Watching the files makes Astro restart
        // on edit instead of silently serving the version from boot.
        const server = join(here, 'server');
        for (const file of readdirSync(server)) {
          if (file.endsWith('.mjs') && !file.endsWith('.test.mjs')) {
            addWatchFile(join(server, file));
          }
        }

        logger.info('studio available at /studio');
      },
    },
  };
}

function studioApiPlugin() {
  return {
    name: 'photo-de-vie:studio-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(STUDIO_PREFIX)) return next();
        handleStudio(req, res);
      });
    },
  };
}
