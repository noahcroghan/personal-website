import { fetchRecentTracks } from "./_lastfm";

interface Env {
  LASTFM_API_KEY?: string;
  LASTFM_USERNAME?: string;
}

/**
 * Cloudflare hands Pages Functions a full `EventContext`; this handler only
 * reads `env`, so declare that much locally. The `@cloudflare/workers-types`
 * ambient globals would otherwise have to be excluded from the browser code in
 * a second tsconfig, since they collide with the DOM lib `index.ts` needs.
 */
type PagesFunction<E> = (context: { env: E }) => Response | Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  return fetchRecentTracks({
    apiKey: context.env.LASTFM_API_KEY,
    username: context.env.LASTFM_USERNAME,
  });
};
