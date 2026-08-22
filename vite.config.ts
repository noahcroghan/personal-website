import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import { fetchRecentTracks } from "./functions/_lastfm.ts";

/**
 * Serves `/now-playing` locally. The deployed site answers that route with the
 * Cloudflare Pages Function in `functions/`; neither the dev nor the preview
 * server runs the Workers runtime, so both mount the shared handler directly.
 */
function lastFmProxy(env: Record<string, string>): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use("/now-playing", async (_req, res) => {
      const response = await fetchRecentTracks({
        apiKey: env.LASTFM_API_KEY,
        username: env.LASTFM_USERNAME,
      });

      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(await response.text());
    });
  };

  return {
    name: "lastfm-proxy",
    configureServer: ({ middlewares }) => mount(middlewares),
    configurePreviewServer: ({ middlewares }) => mount(middlewares),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [lastFmProxy(loadEnv(mode, process.cwd(), ""))],
}));
