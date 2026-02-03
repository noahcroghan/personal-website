async function getNowPlaying() {
  try {
    const response = await fetch("/now-playing");

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    const track = data?.recenttracks?.track?.[0];

    const container = document.getElementById("music-status");

    if (!container) {
      return;
    }

    if (track && track["@attr"]?.nowplaying === "true") {
      // Currently playing
      container.innerHTML = `
        <h2>What am I listening to? <i class="bi bi-music-note"></i></h2>
        <b>${track.name}</b> by ${track.artist["#text"]}`;
      container.classList.add("is-visible");
    } else if (track) {
      // Most recently played
      container.innerHTML = `
        <h2>What am I listening to? <i class="bi bi-music-note"></i></h2>
        <b>${track.name}</b> by ${track.artist["#text"]}`;
      container.classList.add("is-visible");
    }
  } catch (e) {
    console.error("Could not fetch music status", e);
  }
}

getNowPlaying();
