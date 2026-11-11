import { defineConfig } from "vitest/config";
import { loadEnv, type Plugin } from "vite";
import { handlePlaylistRequest } from "./server/spotifyPlaylist";
import { handleSearchRequest } from "./server/youtubeSearch";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

/** Serves /api/* during `pnpm dev` / `pnpm preview`, like the hosting functions do. */
function devApi(env: Record<string, string>): Plugin {
  const mount = (server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }): void => {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const handler =
        url.pathname === "/api/spotify-playlist"
          ? () => handlePlaylistRequest(url, env)
          : url.pathname === "/api/youtube-search"
            ? () => handleSearchRequest(url, env)
            : null;
      if (!handler) return next();
      const { status, body } = await handler();
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
    });
  };
  return { name: "drivemusic-dev-api", configureServer: mount, configurePreviewServer: mount };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    devApi(loadEnv(mode, process.cwd(), ["SPOTIFY_", "YOUTUBE_"])),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "DriveMusic",
        short_name: "DriveMusic",
        description: "Stream, save and play music on your phone.",
        theme_color: "#0b0f0e",
        background_color: "#0b0f0e",
        display: "standalone",
        orientation: "portrait",
        start_url: "./",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // app shell only; audio is cached by the app itself in IndexedDB
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            // cover art, so downloaded songs still show their artwork offline
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "covers",
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.ts"],
  },
}));
