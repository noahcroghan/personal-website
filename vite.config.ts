import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import { fetchNowPlaying } from "./functions/_spotify.ts";

/**
 * Serves `/now-playing` locally. The deployed site answers that route with the
 * Cloudflare Pages Function in `functions/`; neither the dev nor the preview
 * server runs the Workers runtime, so both mount the shared handler directly.
 */
function nowPlayingProxy(env: Record<string, string>): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use("/now-playing", async (_req, res) => {
      const response = await fetchNowPlaying({
        clientId: env.SPOTIFY_CLIENT_ID,
        clientSecret: env.SPOTIFY_CLIENT_SECRET,
        refreshToken: env.SPOTIFY_REFRESH_TOKEN,
      });

      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(await response.text());
    });
  };

  return {
    name: "now-playing-proxy",
    configureServer: ({ middlewares }) => mount(middlewares),
    configurePreviewServer: ({ middlewares }) => mount(middlewares),
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [nowPlayingProxy(loadEnv(mode, ".", ""))],
}));
