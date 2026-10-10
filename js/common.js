/* ============================================================
   COMMON UTILITIES
   Shared across all pages: toast, settings application (theme),
   mascot walk cycle animation swap, small date helpers, the
   companion avatar renderer, and the link/TikTok embed helper.
   ============================================================ */

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function applyTheme() {
  const settings = getSettings();
  document.body.classList.remove('theme-sky', 'theme-sunset', 'theme-mint', 'theme-lavender');
  if (settings.theme && settings.theme !== 'sky') {
    document.body.classList.add('theme-' + settings.theme);
  }
}

/* Swap the mascot image through 4 walk frames to create a
   walking animation instead of a static sliding image. */
function initMascotWalkCycle() {
  const mascot = document.getElementById('mascotImg');
  if (!mascot) return;
  const frames = [
    'assets/sprites/walk_frame_1.png',
    'assets/sprites/walk_frame_2.png',
    'assets/sprites/walk_frame_3.png',
    'assets/sprites/walk_frame_4.png'
  ];
  let frameIndex = 0;
  setInterval(() => {
    frameIndex = (frameIndex + 1) % frames.length;
    mascot.src = frames[frameIndex];
  }, 220);
}

/* ============================================================
   COMPANION AVATAR HELPER
   Companions can have 3 avatar types:
   - sprite: one of the pre-made pixel art characters
   - photo:  a photo the user uploaded, stored as a data URL
   - emoji:  any single emoji picked by the user
   This returns ready to use HTML for a given size class.
   ============================================================ */
function companionAvatarHTML(c, sizeClass) {
  sizeClass = sizeClass || 'companion-avatar';
  if (c.avatarType === 'photo' && c.avatarValue) {
    return `<img src="${c.avatarValue}" class="${sizeClass}" alt="${c.name}" title="${c.name}">`;
  }
  if (c.avatarType === 'emoji' && c.avatarValue) {
    return `<div class="${sizeClass} emoji-avatar" title="${c.name}">${c.avatarValue}</div>`;
  }
  const spriteFile = c.avatarValue || c.sprite || 'companion_ally.png';
  return `<img src="assets/sprites/${spriteFile}" class="${sizeClass}" alt="${c.name}" title="${c.name}">`;
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diffMs = target - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-GB', opts);
  const e = new Date(end).toLocaleDateString('en-GB', opts);
  return `${s} - ${e}`;
}

function formatDateRangeFull(start, end) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  const s = new Date(start).toLocaleDateString('en-GB', opts);
  const e = new Date(end).toLocaleDateString('en-GB', opts);
  return `${s} - ${e}`;
}

/* ============================================================
   LINK / TIKTOK EMBED HELPER
   Detects TikTok links and renders them as a playable embed
   using TikTok's direct iframe player, which renders immediately
   on insertion with no script re-scan step needed. Any other
   link renders as a plain clickable URL.
   ============================================================ */
function isTikTokLink(url) {
  return /tiktok\.com/i.test(url);
}

function extractTikTokVideoId(url) {
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : null;
}

function isTikTokShortLink(url) {
  return /vt\.tiktok\.com|vm\.tiktok\.com/i.test(url);
}

function renderItemLinkHTML(url) {
  if (!url) return '';

  if (isTikTokLink(url)) {
    const videoId = extractTikTokVideoId(url);

    if (videoId) {
      return `
        <div class="item-tiktok-embed">
          <iframe
            src="https://www.tiktok.com/embed/v3/${videoId}"
            width="290" height="520"
            frameborder="0"
            allow="autoplay; encrypted-media; fullscreen"
            allowfullscreen
            scrolling="no">
          </iframe>
        </div>
      `;
    }

    if (isTikTokShortLink(url)) {
      return `<a href="${url}" target="_blank" rel="noopener" class="item-link-plain">🎵 Open TikTok video (tap to watch). For it to play inline here, open the video on TikTok and paste the full link from the address bar instead of a shared short link.</a>`;
    }
  }

  return `<a href="${url}" target="_blank" rel="noopener" class="item-link-plain">🔗 ${url}</a>`;
}

function reloadTikTokEmbeds() {
  // No-op now that TikTok embeds use a plain iframe player,
  // which renders immediately on insertion with no re-scan step.
  // Kept as a function so existing calls elsewhere don't break.
}

/* ---------------- PHOTO LIGHTBOX ---------------- */
function openLightbox(src) {
  const overlay = document.getElementById('lightboxOverlay');
  const img = document.getElementById('lightboxImg');
  if (!overlay || !img) return;
  img.src = src;
  overlay.classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('lightboxOverlay');
  if (overlay) {
    overlay.addEventListener('click', () => overlay.classList.remove('show'));
  }
});

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  initMascotWalkCycle();
});
