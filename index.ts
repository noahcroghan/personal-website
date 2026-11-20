import "virtual:bootstrap-icons.css";
import type { NowPlaying } from "./functions/_spotify.ts";

type Track = NonNullable<NowPlaying["track"]>;

/** Longest gap between polls, and the interval when nothing is playing. */
const MAX_POLL_DELAY_MS = 2 * 60 * 1000;
/** Floor for polls timed to a track's end, in case Spotify lags behind. */
const MIN_POLL_DELAY_MS = 5 * 1000;
/** Gives Spotify a moment to move on to the next track before polling. */
const TRACK_END_BUFFER_MS = 3 * 1000;

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
  icon.ariaHidden = "true";
  heading.append(icon);

  const name = document.createElement("b");
  name.textContent = track.name;

  container.replaceChildren(heading, name, ` by ${track.artist}`);
  container.classList.add("is-visible");
}

/**
 * Resolves once the opacity transition finishes, or straight away when there
 * is none, such as under `prefers-reduced-motion`.
 */
async function fadeOut(container: HTMLElement): Promise<void> {
  container.classList.remove("is-visible");
  await Promise.allSettled(
    container.getAnimations().map((animation) => animation.finished),
  );
}

/** Polls just after the current track should end, or every two minutes. */
function nextPollDelay({
  isPlaying,
  progressMs,
  durationMs,
}: NowPlaying): number {
  if (!isPlaying || progressMs === null || durationMs === null) {
    return MAX_POLL_DELAY_MS;
  }

  const remaining = durationMs - progressMs + TRACK_END_BUFFER_MS;
  return Math.min(Math.max(remaining, MIN_POLL_DELAY_MS), MAX_POLL_DELAY_MS);
}

function startPolling(container: HTMLElement): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let polling = false;
  let shown: string | undefined;

  async function show({ track, isPlaying }: NowPlaying): Promise<void> {
    // The heading depends on `isPlaying`, so pausing or resuming the same
    // track counts as a change too.
    const key = track ? `${track.id}:${isPlaying}` : "";
    if (key === shown) {
      return;
    }

    const isFirst = shown === undefined;
    shown = key;

    if (!isFirst) {
      await fadeOut(container);
    }

    if (track) {
      renderTrack(container, track, isPlaying);
    } else {
      container.replaceChildren();
    }
  }

  async function poll(): Promise<void> {
    clearTimeout(timer);

    // A poll already in flight schedules the next one when it finishes.
    if (polling) {
      return;
    }

    polling = true;
    let delay = MAX_POLL_DELAY_MS;

    try {
      const response = await fetch("/now-playing");

      if (!response.ok) {
        const retryAfterMs = Number(response.headers.get("Retry-After")) * 1000;
        delay = Math.max(delay, retryAfterMs || 0);
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const nowPlaying = (await response.json()) as NowPlaying;
      delay = nextPollDelay(nowPlaying);
      await show(nowPlaying);
    } catch (e) {
      console.error("Could not fetch music status", e);
    } finally {
      polling = false;

      if (!document.hidden) {
        timer = setTimeout(() => void poll(), delay);
      }
    }
  }

  // Nobody sees the widget in a background tab, so stop polling there and
  // catch up as soon as it is visible again.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(timer);
    } else {
      void poll();
    }
  });

  void poll();
}

const musicStatus = document.getElementById("music-status");

if (musicStatus) {
  startPolling(musicStatus);
}
