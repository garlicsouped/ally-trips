/* ============================================================
   SPOTIFY WIDGET (main site pages: dashboard, trip, archive)
   This is a lightweight remote control, not the real player.
   The actual Spotify Web Playback SDK connection lives in a
   separate popup window (spotify-player-window.html) that is
   NOT part of this page's document, so navigating around Ally
   Trips never unloads it and playback keeps going no matter
   where you click.

   This widget opens/focuses that popup (same named window, so
   clicking it again just brings the existing one forward
   instead of spawning a second player) and mirrors its
   now-playing status here via BroadcastChannel, so you get a
   quick glance and basic controls without needing to alt-tab
   to the popup every time.
   ============================================================ */

let spotifySyncChannel = null;
let spotifyWidgetLastHeartbeat = 0;
let spotifyWidgetHeartbeatCheckId = null;

function ensureMiniPlayerBarExists() {
  if (document.getElementById('spotifyMiniPlayer')) return;

  const bar = document.createElement('div');
  bar.id = 'spotifyMiniPlayer';
  bar.className = 'spotify-widget';
  bar.innerHTML = `
    <div class="spotify-widget-collapsed" id="spotifyWidgetCollapsed">
      <span class="spotify-widget-note">🎵</span>
      <img id="spMiniCoverSmall" class="sp-widget-cover-sm" alt="" src="">
    </div>
    <div class="spotify-widget-expanded" id="spotifyWidgetExpanded">
      <div class="sp-widget-header">
        <span class="pixel-font" style="font-size:10px;">SPOTIFY</span>
        <button class="sp-widget-close" id="spWidgetCloseBtn">✕</button>
      </div>

      <div class="sp-player-status" id="spPlayerStatus">
        <span id="spStatusDot" class="sp-status-dot offline"></span>
        <span id="spStatusText">Player window not open</span>
      </div>

      <div class="sp-now-playing">
        <img id="spMiniCover" class="sp-mini-cover" alt="cover" src="">
        <div class="sp-mini-info">
          <div class="sp-mini-title" id="spMiniTitle">Not playing</div>
          <div class="sp-mini-artist" id="spMiniArtist">Open the player to search and play music</div>
        </div>
      </div>
      <div class="sp-mini-progress-track"><div class="sp-mini-progress-fill" id="spMiniProgressFill"></div></div>
      <div class="sp-mini-controls-row">
        <button class="sp-mini-btn" id="spMiniPrev" title="Previous">⏮</button>
        <button class="sp-mini-btn" id="spMiniPlayPause" title="Play/Pause">▶️</button>
        <button class="sp-mini-btn" id="spMiniNext" title="Next">⏭</button>
        <input type="range" id="spMiniVolume" min="0" max="100" value="50" class="sp-mini-volume" title="Volume">
      </div>

      <button class="btn primary" id="spOpenPlayerBtn" style="width:100%;margin-top:10px;">🎵 OPEN PLAYER TO SEARCH & PLAY</button>
      <p style="font-size:11px;color:var(--ink-soft);margin-top:8px;">Keep that player window open in the background, it keeps playing no matter where you navigate in Ally Trips.</p>
    </div>
  `;
  document.body.appendChild(bar);
  bar.classList.add('active');

  document.getElementById('spotifyWidgetCollapsed').addEventListener('click', () => {
    bar.classList.add('open');
    requestNowPlayingUpdate();
  });
  document.getElementById('spWidgetCloseBtn').addEventListener('click', () => {
    bar.classList.remove('open');
  });

  document.getElementById('spOpenPlayerBtn').addEventListener('click', openOrFocusPlayerWindow);
  document.getElementById('spMiniPlayPause').addEventListener('click', () => sendSpotifyCommand('toggle'));
  document.getElementById('spMiniPrev').addEventListener('click', () => sendSpotifyCommand('previous'));
  document.getElementById('spMiniNext').addEventListener('click', () => sendSpotifyCommand('next'));
  document.getElementById('spMiniVolume').addEventListener('change', (e) => sendSpotifyCommand('volume', e.target.value));
}

/* ---------------- OPEN / FOCUS THE PERSISTENT PLAYER WINDOW ---------------- */
function openOrFocusPlayerWindow() {
  // Using the same window name every time means if the player is
  // already open (even from a page you've since navigated away
  // from), this just focuses it instead of opening a duplicate.
  const win = window.open(
    'spotify-player-window.html',
    SPOTIFY_CONFIG.playerWindowName,
    'width=380,height=720,resizable=yes'
  );
  if (!win) {
    showToast('Your browser blocked the popup, please allow popups for this site to use the player');
    return;
  }
  win.focus();
}

/* ---------------- MIRROR NOW-PLAYING STATUS VIA BROADCASTCHANNEL ---------------- */
function initSpotifySync() {
  spotifySyncChannel = new BroadcastChannel(SPOTIFY_CONFIG.syncChannelName);

  spotifySyncChannel.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    if (msg.type === 'state') {
      spotifyWidgetLastHeartbeat = Date.now();
      updateConnectionStatus(true);
      if (msg.playing) {
        renderRemoteNowPlaying(msg);
      } else {
        renderRemoteIdle();
      }
    }
    if (msg.type === 'closing') {
      spotifyWidgetLastHeartbeat = 0;
      updateConnectionStatus(false);
    }
  });

  // Ask immediately in case the player window is already open
  // from before this page loaded.
  requestNowPlayingUpdate();

  // Periodically check whether we've heard from the player
  // window recently; if not, treat it as closed/not open.
  spotifyWidgetHeartbeatCheckId = setInterval(() => {
    const silent = Date.now() - spotifyWidgetLastHeartbeat > 5000;
    if (silent) updateConnectionStatus(false);
  }, 3000);
}

function requestNowPlayingUpdate() {
  if (spotifySyncChannel) spotifySyncChannel.postMessage({ type: 'ping' });
}

function sendSpotifyCommand(action, value) {
  if (!spotifySyncChannel) return;
  spotifySyncChannel.postMessage({ type: 'command', action, value });
}

function updateConnectionStatus(connected) {
  const dot = document.getElementById('spStatusDot');
  const text = document.getElementById('spStatusText');
  const openBtn = document.getElementById('spOpenPlayerBtn');
  if (!dot || !text) return;

  if (connected) {
    dot.classList.remove('offline');
    dot.classList.add('online');
    text.textContent = 'Player window is open and connected';
    if (openBtn) openBtn.textContent = '🎵 FOCUS PLAYER WINDOW';
  } else {
    dot.classList.remove('online');
    dot.classList.add('offline');
    text.textContent = 'Player window not open';
    renderRemoteIdle();
    if (openBtn) openBtn.textContent = '🎵 OPEN PLAYER TO SEARCH & PLAY';
  }
}

function renderRemoteNowPlaying(msg) {
  ensureMiniPlayerBarExists();
  document.getElementById('spMiniCover').src = msg.cover || '';
  document.getElementById('spMiniCoverSmall').src = msg.cover || '';
  document.getElementById('spMiniTitle').textContent = msg.title || 'Not playing';
  document.getElementById('spMiniArtist').textContent = msg.artist || '';
  document.getElementById('spMiniPlayPause').textContent = msg.isPlaying ? '⏸' : '▶️';

  const fill = document.getElementById('spMiniProgressFill');
  if (fill && msg.durationMs) {
    const pct = Math.min(100, (msg.progressMs / msg.durationMs) * 100);
    fill.style.width = pct + '%';
  }
}

function renderRemoteIdle() {
  const title = document.getElementById('spMiniTitle');
  if (!title) return;
  document.getElementById('spMiniTitle').textContent = 'Not playing';
  document.getElementById('spMiniArtist').textContent = 'Open the player to search and play music';
  document.getElementById('spMiniPlayPause').textContent = '▶️';
  document.getElementById('spMiniCoverSmall').src = '';
  const fill = document.getElementById('spMiniProgressFill');
  if (fill) fill.style.width = '0%';
}

/* ---------------- INIT ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (isSpotifyConnected()) {
    ensureMiniPlayerBarExists();
    initSpotifySync();
  }
});
