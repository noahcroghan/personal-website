import { fetchNowPlaying } from "./_spotify";

interface Env {
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_REFRESH_TOKEN?: string;
}

/**
 * Cloudflare hands Pages Functions a full `EventContext`; this handler only
 * reads `env`, so declare that much locally. The `@cloudflare/workers-types`
 * ambient globals would otherwise have to be excluded from the browser code in
 * a second tsconfig, since they collide with the DOM lib `index.ts` needs.
 */
type PagesFunction<E> = (context: { env: E }) => Response | Promise<Response>;

export const onRequest: PagesFunction<Env> = async (context) => {
  return fetchNowPlaying({
    clientId: context.env.SPOTIFY_CLIENT_ID,
    clientSecret: context.env.SPOTIFY_CLIENT_SECRET,
    refreshToken: context.env.SPOTIFY_REFRESH_TOKEN,
  });
};
