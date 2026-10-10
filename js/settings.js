/* ============================================================
   SETTINGS PAGE LOGIC
   Lets the user change temperature unit, theme, tag style
   wording, toggle sound effects and background music, see the
   sprite gallery, and connect/disconnect Spotify.
   ============================================================ */

const SPRITE_GALLERY = [
  'companion_ally.png',
  'companion_natashia.png',
  'companion_amos.png',
  'companion_jia.png',
  'companion_ryan.png',
  'companion_priya.png',
  'companion_marcus.png'
];

function refreshSettingsUI() {
  const settings = getSettings();

  document.querySelectorAll('#tempUnitOptions .option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === settings.tempUnit);
  });

  document.querySelectorAll('#themeOptions .option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === settings.theme);
  });

  document.querySelectorAll('#tagStyleOptions .option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === settings.tagStyle);
  });

  document.getElementById('soundToggle').classList.toggle('on', settings.soundEffects);
  document.getElementById('musicToggle').classList.toggle('on', settings.backgroundMusic);
}

document.querySelectorAll('#tempUnitOptions .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const settings = getSettings();
    settings.tempUnit = btn.dataset.value;
    saveSettings(settings);
    refreshSettingsUI();
    showToast('Temperature unit updated');
  });
});

document.querySelectorAll('#themeOptions .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const settings = getSettings();
    settings.theme = btn.dataset.value;
    saveSettings(settings);
    applyTheme();
    refreshSettingsUI();
    showToast('Theme updated');
  });
});

document.querySelectorAll('#tagStyleOptions .option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const settings = getSettings();
    settings.tagStyle = btn.dataset.value;
    saveSettings(settings);
    refreshSettingsUI();
    showToast('Tag style updated');
  });
});

document.getElementById('soundToggle').addEventListener('click', () => {
  const settings = getSettings();
  settings.soundEffects = !settings.soundEffects;
  saveSettings(settings);
  refreshSettingsUI();
  if (settings.soundEffects) sfxClick();
});

document.getElementById('musicToggle').addEventListener('click', () => {
  const settings = getSettings();
  settings.backgroundMusic = !settings.backgroundMusic;
  saveSettings(settings);
  toggleMusic(settings.backgroundMusic);
  refreshSettingsUI();
  showToast(settings.backgroundMusic ? 'Background music on' : 'Background music off');
});

function renderSpriteGallery() {
  const gallery = document.getElementById('spriteGallery');
  gallery.innerHTML = SPRITE_GALLERY.map(s => `
    <div class="identity-option" style="cursor:default;">
      <img src="assets/sprites/${s}" alt="${s}">
    </div>
  `).join('');
}

/* ---------------- SPOTIFY ---------------- */
/* This page only handles connect/disconnect. Search, playlists,
   and playback controls live in the floating widget that
   spotify-player.js injects into every page. */
function refreshSpotifyConnectionUI() {
  const connected = isSpotifyConnected();
  document.getElementById('spotifyConnectRow').style.display = connected ? 'none' : 'flex';
  document.getElementById('spotifyConnectedRow').style.display = connected ? 'flex' : 'none';
}

document.getElementById('spotifyConnectBtn').addEventListener('click', () => {
  spotifyLogin();
});

document.getElementById('spotifyDisconnectBtn').addEventListener('click', () => {
  spotifyLogout();
  refreshSpotifyConnectionUI();
  showToast('Spotify disconnected');
  const bar = document.getElementById('spotifyMiniPlayer');
  if (bar) bar.classList.remove('active');
  if (typeof spotifyPollIntervalId !== 'undefined' && spotifyPollIntervalId) {
    clearInterval(spotifyPollIntervalId);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  refreshSettingsUI();
  renderSpriteGallery();
  refreshSpotifyConnectionUI();
});
