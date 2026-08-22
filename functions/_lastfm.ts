export interface LastFmCredentials {
  apiKey?: string;
  username?: string;
}

export async function fetchRecentTracks({
  apiKey,
  username,
}: LastFmCredentials): Promise<Response> {
  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  if (!username) {
    return Response.json({ error: "Last.fm username not configured" }, { status: 500 });
  }

  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${encodeURIComponent(apiKey)}&format=json&limit=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return Response.json({ error: "Last.fm API error" }, { status: 500 });
    }

    const data = await response.json();

    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=30",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return Response.json({ error: message }, { status: 500 });
  }
}
