interface LastFmArtist {
  "#text": string;
}

interface LastFmTrack {
  name: string;
  artist: LastFmArtist;
  "@attr"?: {
    nowplaying?: string;
  };
}

interface RecentTracksResponse {
  recenttracks?: {
    track?: LastFmTrack[];
  };
}

function renderTrack(container: HTMLElement, track: LastFmTrack): void {
  const heading = document.createElement("h2");
  heading.append("What am I listening to? ");

  const icon = document.createElement("i");
  icon.className = "bi bi-music-note";
  heading.append(icon);

  const name = document.createElement("b");
  name.textContent = track.name;

  container.replaceChildren(heading, name, ` by ${track.artist["#text"]}`);
  container.classList.add("is-visible");
}

async function getNowPlaying(): Promise<void> {
  try {
    const response = await fetch("/now-playing");

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const lastFmResponse = (await response.json()) as RecentTracksResponse;
    const recentTrack = lastFmResponse?.recenttracks?.track?.[0];

    const musicStatusContainer = document.getElementById("music-status");

    if (!musicStatusContainer || !recentTrack) {
      return;
    }

    // The same markup covers both the currently playing and the most
    // recently played track.
    renderTrack(musicStatusContainer, recentTrack);
  } catch (e) {
    console.error("Could not fetch music status", e);
  }
}

void getNowPlaying();
