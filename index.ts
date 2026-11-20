import type { NowPlaying } from "./functions/_spotify.ts";

type Track = NonNullable<NowPlaying["track"]>;

function renderTrack(
  container: HTMLElement,
  track: Track,
  isPlaying: boolean,
): void {
  const heading = document.createElement("h2");
  heading.append(
    isPlaying ? "What am I listening to? " : "What was I listening to? ",
  );

  const icon = document.createElement("i");
  icon.className = "bi bi-music-note";
  heading.append(icon);

  const name = document.createElement("b");
  name.textContent = track.name;

  container.replaceChildren(heading, name, ` by ${track.artist}`);
  container.classList.add("is-visible");
}

async function getNowPlaying(): Promise<void> {
  try {
    const response = await fetch("/now-playing");

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const { track, isPlaying } = (await response.json()) as NowPlaying;

    const musicStatusContainer = document.getElementById("music-status");

    if (!musicStatusContainer || !track) {
      return;
    }

    renderTrack(musicStatusContainer, track, isPlaying);
  } catch (e) {
    console.error("Could not fetch music status", e);
  }
}

void getNowPlaying();
