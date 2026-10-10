/* ============================================================
   SPOTIFY PLAYER WINDOW (the real, persistent player)
   This file only runs inside spotify-player-window.html, a
   separate browser window opened from the main site. Because
   it is its own window rather than content inside the main
   Ally Trips tab, navigating around the main site does NOT
   unload this document, so the Spotify Web Playback SDK
   connection and audio keep running uninterrupted no matter
   where you click in Ally Trips.

   This window broadcasts its now-playing status on a
   BroadcastChannel so the small widget on every main page can
   mirror what's playing and send remote commands back here.
   ============================================================ */

let spotifySDKPlayer = null;
let spotifySDKDeviceId = null;
let spotifyLastKnownState = null;
let spotifyProgressIntervalId = null;
let spotifyPlaylistsLoaded = false;

const syncChannel = new BroadcastChannel(SPOTIFY_CONFIG.syncChannelName);

/* ---------------- BROADCAST STATE TO MAIN SITE WIDGET ---------------- */
function broadcastNowPlaying() {
  if (!spotifyLastKnownState) {
    syncChannel.postMessage({ type: 'state', playing: false });
    return;
  }
  syncChannel.postMessage({
    type: 'state',
    playing: true,
    title: spotifyLastKnownState.title,
    artist: spotifyLastKnownState.artist,
    cover: spotifyLastKnownState.cover,
    isPlaying: spotifyLastKnownState.isPlaying,
    progressMs: spotifyLastKnownState.progressMs,
    durationMs: spotifyLastKnownState.durationMs
  });
}

/* Listen for remote control commands sent from the small widget
   on the main site's pages (play/pause/next/prev/volume/play a
   specific uri found via search there, though search also works
   directly in this window). */
syncChannel.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  if (msg.type === 'command') {
    if (msg.action === 'toggle') spotifyTogglePlayPause();
    if (msg.action === 'next') spotifyApiControl('next');
    if (msg.action === 'previous') spotifyApiControl('previous');
    if (msg.action === 'volume') spotifySetVolume(msg.value);
  }
  if (msg.type === 'play_uri') {
    spotifyPlayUri(msg.uri, msg.uriType);
  }
  if (msg.type === 'ping') {
    broadcastNowPlaying();
  }
});

// Periodic heartbeat so the main site widget knows this window
// is alive and can show "connected" vs "open player" state.
setInterval(broadcastNowPlaying, 2000);

/* ---------------- WEB PLAYBACK SDK ---------------- */
window.onSpotifyWebPlaybackSDKReady = () => {
  initSpotifySDKPlayer();
};

function initSpotifySDKPlayer() {
  if (spotifySDKPlayer) return;

  const player = new Spotify.Player({
    name: 'Ally Trips Player',
    getOAuthToken: async (cb) => {
      const token = await spotifyGetValidAccessToken();
      if (token) cb(token);
    },
    volume: 0.5
  });

  player.addListener('ready', ({ device_id }) => {
    spotifySDKDeviceId = device_id;
    document.getElementById('spDeviceNote').textContent = '✅ Ready to play, search below';
  });

  player.addListener('not_ready', () => {
    spotifySDKDeviceId = null;
  });

  player.addListener('player_state_changed', (state) => {
    if (!state) return;
    const track = state.track_window.current_track;
    spotifyLastKnownState = {
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      cover: track.album.images[0] ? track.album.images[0].url : '',
      progressMs: state.position,
      durationMs: state.duration,
      isPlaying: !state.paused,
      fetchedAt: Date.now()
    };
    renderNowPlaying();
    broadcastNowPlaying();
  });

  player.addListener('initialization_error', ({ message }) => console.error('Spotify init error', message));
  player.addListener('authentication_error', ({ message }) => console.error('Spotify auth error', message));
  player.addListener('account_error', ({ message }) => {
    document.getElementById('spDeviceNote').textContent = '⚠️ Spotify Premium is required to play directly in the browser';
    console.error('Spotify account error', message);
  });

  player.connect().then(connected => {
    if (connected) spotifySDKPlayer = player;
  });
}

/* ---------------- NOW PLAYING DISPLAY ---------------- */
function renderNowPlaying() {
  if (!spotifyLastKnownState) return;
  document.getElementById('spMiniCover').src = spotifyLastKnownState.cover;
  document.getElementById('spMiniTitle').textContent = spotifyLastKnownState.title;
  document.getElementById('spMiniArtist').textContent = spotifyLastKnownState.artist;
  document.getElementById('spMiniPlayPause').textContent = spotifyLastKnownState.isPlaying ? '⏸' : '▶️';
}

function startProgressTicker() {
  if (spotifyProgressIntervalId) return;
  spotifyProgressIntervalId = setInterval(() => {
    const fill = document.getElementById('spMiniProgressFill');
    if (!fill || !spotifyLastKnownState || !spotifyLastKnownState.durationMs) return;
    let elapsed = spotifyLastKnownState.progressMs;
    if (spotifyLastKnownState.isPlaying) {
      elapsed += Date.now() - spotifyLastKnownState.fetchedAt;
    }
    const pct = Math.min(100, (elapsed / spotifyLastKnownState.durationMs) * 100);
    fill.style.width = pct + '%';
  }, 1000);
}
startProgressTicker();

/* ---------------- PLAYBACK CONTROLS ---------------- */
async function spotifyTogglePlayPause() {
  if (spotifySDKPlayer) await spotifySDKPlayer.togglePlay();
}

async function spotifyApiControl(action) {
  if (!spotifySDKPlayer) return;
  if (action === 'next') return spotifySDKPlayer.nextTrack();
  if (action === 'previous') return spotifySDKPlayer.previousTrack();
}

async function spotifySetVolume(value) {
  if (spotifySDKPlayer) await spotifySDKPlayer.setVolume(value / 100);
}

document.getElementById('spMiniPlayPause').addEventListener('click', spotifyTogglePlayPause);
document.getElementById('spMiniPrev').addEventListener('click', () => spotifyApiControl('previous'));
document.getElementById('spMiniNext').addEventListener('click', () => spotifyApiControl('next'));
document.getElementById('spMiniVolume').addEventListener('change', (e) => spotifySetVolume(e.target.value));

/* ---------------- PLAY A SPECIFIC TRACK / PLAYLIST ---------------- */
async function spotifyPlayUri(uri, type) {
  const token = await spotifyGetValidAccessToken();
  if (!token || !spotifySDKDeviceId) {
    showToast('Still connecting, try again in a second');
    return;
  }
  const body = type === 'track' ? { uris: [uri] } : { context_uri: uri };
  try {
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifySDKDeviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    showToast('Could not reach Spotify, check your connection and try again');
  }
}

/* ---------------- SEARCH ---------------- */
async function spotifySearch(query) {
  const token = await spotifyGetValidAccessToken();
  if (!token) return [];

  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({
    q: query,
    type: 'track,playlist',
    limit: 10
  })}`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return [];
  const data = await response.json();

  const tracks = (data.tracks ? data.tracks.items : []).map(t => ({
    type: 'track',
    uri: t.uri,
    name: t.name,
    subtitle: t.artists.map(a => a.name).join(', '),
    image: t.album.images[t.album.images.length - 1] ? t.album.images[t.album.images.length - 1].url : ''
  }));

  const playlists = (data.playlists ? data.playlists.items : []).filter(Boolean).map(p => ({
    type: 'playlist',
    uri: p.uri,
    name: p.name,
    subtitle: 'Playlist · ' + (p.owner ? p.owner.display_name : ''),
    image: p.images && p.images[0] ? p.images[0].url : ''
  }));

  return [...tracks, ...playlists];
}

async function runSearch() {
  const input = document.getElementById('spotifySearchInput');
  const query = input.value.trim();
  if (!query) return;

  const wrap = document.getElementById('spotifySearchResults');
  wrap.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">Searching...</p>';

  const results = await spotifySearch(query);

  if (results.length === 0) {
    wrap.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">No results found.</p>';
    return;
  }

  wrap.innerHTML = '';
  results.forEach(item => {
    const row = document.createElement('div');
    row.className = 'spotify-result-row';
    row.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
      <div class="spotify-result-info">
        <div class="spotify-result-name">${item.name}</div>
        <div class="spotify-result-subtitle">${item.subtitle}</div>
      </div>
    `;
    row.addEventListener('click', () => {
      spotifyPlayUri(item.uri, item.type);
      showToast(`Playing ${item.name}`);
    });
    wrap.appendChild(row);
  });
}

document.getElementById('spotifySearchBtn').addEventListener('click', runSearch);
document.getElementById('spotifySearchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runSearch();
});

/* ---------------- YOUR PLAYLISTS ---------------- */
async function loadPlaylists() {
  const wrap = document.getElementById('spotifyPlaylistResults');
  const heading = document.getElementById('spotifyPlaylistsHeading');

  if (!spotifyHasScope('playlist-read-private')) {
    heading.innerHTML = 'YOUR PLAYLISTS <span style="color:var(--coral-deep);font-weight:700;">(reconnect needed)</span>';
    wrap.innerHTML = `<div style="font-size:13px;color:var(--ink-soft);padding:8px 0;">
      Playlist access was added after you first connected. Go to Settings, disconnect, then connect again to grant access to your playlists.
    </div>`;
    return;
  }

  wrap.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">Loading your playlists...</p>';

  const token = await spotifyGetValidAccessToken();
  if (!token) {
    wrap.innerHTML = '';
    return;
  }

  try {
    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 403) {
      wrap.innerHTML = `<div style="font-size:13px;color:var(--ink-soft);padding:8px 0;">
        Spotify denied access to your playlists. Go to Settings, disconnect, then connect again.
      </div>`;
      return;
    }
    if (!res.ok) {
      wrap.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">Could not load playlists right now.</p>';
      return;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      wrap.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">No playlists found on this Spotify account.</p>';
      return;
    }

    wrap.innerHTML = '';
    data.items.forEach(p => {
      const row = document.createElement('div');
      row.className = 'spotify-result-row';
      const cover = p.images && p.images[0] ? p.images[0].url : '';
      row.innerHTML = `
        <img src="${cover}" alt="${p.name}">
        <div class="spotify-result-info">
          <div class="spotify-result-name">${p.name}</div>
          <div class="spotify-result-subtitle">${p.tracks.total} tracks</div>
        </div>
      `;
      row.addEventListener('click', () => {
        spotifyPlayUri(p.uri, 'playlist');
        showToast(`Playing ${p.name}`);
      });
      wrap.appendChild(row);
    });
  } catch (e) {
    wrap.innerHTML = '<p style="font-size:13px;color:var(--ink-soft);">Could not load playlists right now.</p>';
  }
}

/* ---------------- INIT ---------------- */
if (!isSpotifyConnected()) {
  document.querySelector('.player-window-wrap').innerHTML = `
    <h2 class="pixel-font" style="font-size:14px;">NOT CONNECTED</h2>
    <p style="font-size:13px;color:var(--ink-soft);margin-top:12px;">Go back to Ally Trips, open Settings, and connect your Spotify account first, then reopen this player.</p>
  `;
} else {
  loadPlaylists();
  spotifyPlaylistsLoaded = true;
}

// Keep broadcasting even if nothing has started playing yet, so
// the main site widget can tell the difference between "this
// window isn't open" and "it's open but idle".
window.addEventListener('beforeunload', () => {
  syncChannel.postMessage({ type: 'closing' });
});
