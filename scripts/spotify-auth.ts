/**
 * Authorizes the site to read your Spotify playback and saves the resulting
 * refresh token to `.env`. Spotify expires refresh tokens six months after
 * authorization, so rerun this before then.
 *
 * Requires `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`, and
 * `REDIRECT_URI` registered on the app in the Spotify Developer Dashboard.
 */

const PORT = 8888;
// Spotify rejects `localhost`, but allows HTTP for loopback IP literals.
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ["user-read-currently-playing", "user-read-recently-played"];
const ENV_FILE = ".env";
// Tracked so `.github/workflows/spotify-reauth-reminder.yml` can open an
// issue before the refresh token expires; Spotify doesn't expose its age.
const AUTHORIZED_AT_FILE = ".github/spotify-authorized-at";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    `Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in ${ENV_FILE} first.`,
  );
  process.exit(1);
}

const basicAuth = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
const state = crypto.randomUUID();

const authorizeUrl = new URL("https://accounts.spotify.com/authorize");
authorizeUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: clientId,
  scope: SCOPES.join(" "),
  redirect_uri: REDIRECT_URI,
  state,
  // Always show the consent screen, so you can confirm which account it is.
  show_dialog: "true",
}).toString();

async function exchangeCode(code: string) {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: basicAuth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Token exchange failed (${response.status}): ${await response.text()}`,
    );
  }

  return (await response.json()) as {
    access_token: string;
    refresh_token: string;
  };
}

/** Confirms the grant can actually read playback before saving it. */
async function verify(accessToken: string) {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (response.status === 403) {
    throw new Error(
      "Spotify refused access (403). Development Mode apps only work for the " +
        "app owner (who needs Premium) and users added under User Management.",
    );
  }

  if (!response.ok) {
    throw new Error(`Verification request failed (${response.status})`);
  }
}

async function saveRefreshToken(refreshToken: string) {
  const file = Bun.file(ENV_FILE);
  const contents = (await file.exists()) ? await file.text() : "";
  const line = `SPOTIFY_REFRESH_TOKEN=${refreshToken}`;
  const pattern = /^SPOTIFY_REFRESH_TOKEN=.*$/m;

  const updated = pattern.test(contents)
    ? contents.replace(pattern, () => line)
    : `${contents}${contents === "" || contents.endsWith("\n") ? "" : "\n"}${line}\n`;

  await Bun.write(ENV_FILE, updated);
}

async function handleCallback(params: URLSearchParams) {
  const error = params.get("error");
  if (error) {
    throw new Error(`Authorization denied: ${error}`);
  }

  if (params.get("state") !== state) {
    throw new Error("State mismatch; refusing the callback.");
  }

  const code = params.get("code");
  if (!code) {
    throw new Error("Callback is missing the authorization code.");
  }

  const { access_token, refresh_token } = await exchangeCode(code);
  await verify(access_token);
  await saveRefreshToken(refresh_token);
  await Bun.write(
    AUTHORIZED_AT_FILE,
    `${new Date().toISOString().slice(0, 10)}\n`,
  );
}

const { promise: finished, resolve, reject } = Promise.withResolvers<void>();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/callback") {
      return new Response("Not found", { status: 404 });
    }

    try {
      await handleCallback(url.searchParams);
      resolve();
      return new Response("Spotify authorized. You can close this tab.");
    } catch (error) {
      reject(error);
      return new Response("Authorization failed; see the terminal.", {
        status: 500,
      });
    }
  },
});

console.log(`Opening Spotify to authorize. If nothing opens, visit:
${authorizeUrl}
`);

const openers: Record<string, string> = {
  darwin: "open",
  linux: "xdg-open",
  win32: "explorer",
};
const opener = openers[process.platform];
if (opener) {
  Bun.spawn([opener, authorizeUrl.toString()], { stdout: "ignore" });
}

try {
  await finished;
  console.log(`Saved SPOTIFY_REFRESH_TOKEN to ${ENV_FILE}. It expires in six months.

Next:
  1. Copy it into the Cloudflare Pages project's secrets (Settings > Variables
     and Secrets) and redeploy.
  2. Commit and push ${AUTHORIZED_AT_FILE}, so the renewal reminder
     knows when to fire.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await server.stop();
}
