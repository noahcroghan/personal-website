export interface SpotifyCredentials {
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
}

/**
 * The provider-agnostic shape `/now-playing` returns, so the frontend never
 * depends on Spotify's response format.
 */
export interface NowPlaying {
  track: {
    id: string;
    name: string;
    artist: string;
  } | null;
  /** False when `track` is paused or is the most recently played track. */
  isPlaying: boolean;
  progressMs: number | null;
  durationMs: number | null;
}

interface SpotifyTrack {
  type: "track";
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
}

interface CurrentlyPlayingResponse {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | { type: "episode" } | null;
}

interface RecentlyPlayedResponse {
  items: { track: SpotifyTrack }[];
}

class SpotifyError extends Error {
  constructor(
    message: string,
    readonly retryAfter?: string,
  ) {
    super(message);
  }
}

const API = "https://api.spotify.com/v1";

/**
 * Best-effort cache: it lives as long as the Worker isolate (or the dev server)
 * does, which spares most requests a round trip to the token endpoint.
 */
let cachedToken: { value: string; expiresAt: number } | undefined;

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    // Refresh tokens expire six months after authorization.
    if (error === "invalid_grant") {
      throw new SpotifyError(
        "Spotify refresh token expired or was revoked; run `bun run spotify:auth`",
      );
    }

    throw new SpotifyError(`Spotify token endpoint error: ${response.status}`);
  }

  const { access_token, expires_in } = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Refresh a minute early so a token never expires mid-request.
  cachedToken = {
    value: access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000,
  };

  return access_token;
}

/** Returns `undefined` for 204 No Content (nothing playing). */
async function getJson<T>(path: string, token: string): Promise<T | undefined> {
  const response = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    cachedToken = undefined;
  }

  if (response.status === 429) {
    throw new SpotifyError(
      "Spotify rate limit hit",
      response.headers.get("Retry-After") ?? undefined,
    );
  }

  if (!response.ok) {
    throw new SpotifyError(`Spotify API error: ${response.status} ${path}`);
  }

  return response.status === 204 ? undefined : ((await response.json()) as T);
}

function toTrack(track: SpotifyTrack): NonNullable<NowPlaying["track"]> {
  return {
    id: track.id,
    name: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
  };
}

async function getNowPlaying(token: string): Promise<NowPlaying> {
  const current = await getJson<CurrentlyPlayingResponse>(
    "/me/player/currently-playing",
    token,
  );

  // Podcasts and ads come back with a non-track `item` (or none at all), so
  // only a track counts; a paused one still beats the recently played list.
  if (current?.item?.type === "track") {
    return {
      track: toTrack(current.item),
      isPlaying: current.is_playing,
      progressMs: current.progress_ms,
      durationMs: current.item.duration_ms,
    };
  }

  const recent = await getJson<RecentlyPlayedResponse>(
    "/me/player/recently-played?limit=1",
    token,
  );
  const last = recent?.items[0]?.track;

  return {
    track: last ? toTrack(last) : null,
    isPlaying: false,
    progressMs: null,
    durationMs: null,
  };
}

export async function fetchNowPlaying({
  clientId,
  clientSecret,
  refreshToken,
}: SpotifyCredentials): Promise<Response> {
  if (!clientId || !clientSecret || !refreshToken) {
    return Response.json(
      { error: "Spotify credentials not configured" },
      { status: 500 },
    );
  }

  try {
    const token = await getAccessToken(clientId, clientSecret, refreshToken);

    return Response.json(await getNowPlaying(token), {
      headers: {
        // The frontend schedules its own polls around the track's progress,
        // so a cached response would throw off its timing.
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);

    const retryAfter = error instanceof SpotifyError && error.retryAfter;

    return Response.json(
      { error: "Could not fetch now playing" },
      {
        status: retryAfter ? 503 : 502,
        headers: retryAfter ? { "Retry-After": retryAfter } : {},
      },
    );
  }
}
