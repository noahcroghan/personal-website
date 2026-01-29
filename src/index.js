export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/now-playing") {
      return handleNowPlaying(env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleNowPlaying(env) {
  const apiKey = env.LASTFM_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  const user = "varshious";
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${user}&api_key=${apiKey}&format=json&limit=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return Response.json({ error: "Last.fm API error" }, { status: 500 });
    }

    const data = await response.json();

    return Response.json(data, {
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
