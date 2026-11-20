import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import subsetFont from "subset-font";
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

/**
 * Serves `virtual:bootstrap-icons.css`: Bootstrap Icons' stylesheet with only
 * the `bi-*` icons that `sources` use, and its font subset to match and
 * inlined as a data URL. The full font is 134 KB and its CSS has over 2,000
 * rules; the few icons used here come to about 1 KB, so they render with the
 * page instead of popping in once a separate font file downloads.
 */
function bootstrapIcons(sources: string[]): Plugin {
  const id = "virtual:bootstrap-icons.css";
  const resolvedId = `\0${id}`;
  const fromPackage = (file: string) =>
    readFile(createRequire(import.meta.url).resolve(`bootstrap-icons/${file}`));

  return {
    name: "bootstrap-icons",
    resolveId: (source) => (source === id ? resolvedId : undefined),
    async load(loadId) {
      if (loadId !== resolvedId) {
        return;
      }

      const codepoints = JSON.parse(
        (await fromPackage("font/bootstrap-icons.json")).toString(),
      ) as Record<string, number>;
      const used = new Map<string, number>();

      for (const source of sources) {
        const path = resolve(source);
        this.addWatchFile(path);

        const text = await readFile(path, "utf8");
        for (const [, name] of text.matchAll(/\bbi-([a-z0-9-]+)/g)) {
          const codepoint = codepoints[name!];
          if (codepoint === undefined) {
            this.warn(`Unknown Bootstrap Icon \`bi-${name}\` in ${source}`);
          } else {
            used.set(name!, codepoint);
          }
        }
      }

      if (used.size === 0) {
        return "";
      }

      const font = await subsetFont(
        await fromPackage("font/fonts/bootstrap-icons.woff2"),
        String.fromCodePoint(...used.values()),
        { targetFormat: "woff2" },
      );

      // Everything before the first icon rule: the license, `@font-face`, and
      // the `.bi::before` rules every icon shares.
      const stylesheet = (
        await fromPackage("font/bootstrap-icons.css")
      ).toString();
      const preamble = stylesheet.slice(0, stylesheet.indexOf("\n.bi-"));
      const src = /src:[^;]+;/;

      if (!src.test(preamble)) {
        this.error(
          "Could not find `@font-face` in Bootstrap Icons' stylesheet",
        );
      }

      const icons = [...used]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(
          ([name, codepoint]) =>
            `.bi-${name}::before { content: "\\${codepoint.toString(16)}"; }`,
        );

      return [
        preamble.replace(
          src,
          `src: url("data:font/woff2;base64,${font.toString("base64")}") format("woff2");`,
        ),
        ...icons,
      ].join("\n");
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    nowPlayingProxy(loadEnv(mode, ".", "")),
    bootstrapIcons(["index.html", "index.ts"]),
  ],
}));
