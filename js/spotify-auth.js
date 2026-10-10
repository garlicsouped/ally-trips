/* ============================================================
   SPOTIFY AUTH (Authorization Code with PKCE)
   Spotify retired the old Implicit Grant flow, so this uses the
   currently recommended PKCE flow for browser-only apps with no
   backend server. Tokens and the PKCE verifier are kept in
   localStorage so a connection survives a page reload and
   across the different pages of this multi page site.
   ============================================================ */

const SPOTIFY_TOKEN_KEY = 'allyTripsSpotifyToken';
const SPOTIFY_VERIFIER_KEY = 'allyTripsSpotifyVerifier';

function spotifyGenerateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function spotifySha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function spotifyBase64UrlEncode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/* ---------------- TOKEN STORAGE ---------------- */
function getSpotifyToken() {
  const raw = localStorage.getItem(SPOTIFY_TOKEN_KEY);
  if (!raw) return null;
  try {
    const token = JSON.parse(raw);
    if (token.expiresAt && Date.now() > token.expiresAt) {
      return null; // expired, caller should trigger refresh
    }
    return token;
  } catch (e) {
    return null;
  }
}

function getSpotifyTokenRaw() {
  const raw = localStorage.getItem(SPOTIFY_TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveSpotifyToken(tokenResponse) {
  const stored = {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || (getSpotifyTokenRaw() || {}).refreshToken,
    expiresAt: Date.now() + (tokenResponse.expires_in * 1000) - 30000,
    grantedScopes: tokenResponse.scope || (getSpotifyTokenRaw() || {}).grantedScopes || ''
  };
  localStorage.setItem(SPOTIFY_TOKEN_KEY, JSON.stringify(stored));
  return stored;
}

function spotifyHasScope(scope) {
  const stored = getSpotifyTokenRaw();
  if (!stored || !stored.grantedScopes) return false;
  return stored.grantedScopes.split(' ').includes(scope);
}

function clearSpotifyToken() {
  localStorage.removeItem(SPOTIFY_TOKEN_KEY);
}

function isSpotifyConnected() {
  return !!getSpotifyTokenRaw();
}

/* ---------------- LOGIN ---------------- */
async function spotifyLogin() {
  const codeVerifier = spotifyGenerateRandomString(64);
  localStorage.setItem(SPOTIFY_VERIFIER_KEY, codeVerifier);

  const hashed = await spotifySha256(codeVerifier);
  const codeChallenge = spotifyBase64UrlEncode(hashed);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  const params = {
    response_type: 'code',
    client_id: SPOTIFY_CONFIG.clientId,
    scope: SPOTIFY_CONFIG.scopes,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: SPOTIFY_CONFIG.redirectUri
  };
  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

/* ---------------- CALLBACK HANDLING (runs on spotify-callback.html) ---------------- */
async function spotifyHandleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const error = params.get('error');

  if (error) {
    return { success: false, error };
  }
  if (!code) {
    return { success: false, error: 'No authorization code returned' };
  }

  const codeVerifier = localStorage.getItem(SPOTIFY_VERIFIER_KEY);
  if (!codeVerifier) {
    return { success: false, error: 'Missing code verifier, please try connecting again' };
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_CONFIG.redirectUri,
        code_verifier: codeVerifier
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.error_description || data.error || 'Token exchange failed' };
    }

    saveSpotifyToken(data);
    localStorage.removeItem(SPOTIFY_VERIFIER_KEY);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/* ---------------- REFRESH ---------------- */
async function spotifyRefreshToken() {
  const stored = getSpotifyTokenRaw();
  if (!stored || !stored.refreshToken) return null;

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        grant_type: 'refresh_token',
        refresh_token: stored.refreshToken
      })
    });
    const data = await response.json();
    if (!response.ok) {
      clearSpotifyToken();
      return null;
    }
    return saveSpotifyToken(data);
  } catch (e) {
    return null;
  }
}

/* Returns a valid access token, refreshing first if needed. */
async function spotifyGetValidAccessToken() {
  let token = getSpotifyToken();
  if (token) return token.accessToken;

  const refreshed = await spotifyRefreshToken();
  if (refreshed) return refreshed.accessToken;

  return null;
}

function spotifyLogout() {
  clearSpotifyToken();
  localStorage.removeItem(SPOTIFY_VERIFIER_KEY);
}
