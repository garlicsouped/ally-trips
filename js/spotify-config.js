/* ============================================================
   SPOTIFY CONFIG
   Your Spotify Client ID goes here. This value is public by
   design, Spotify's PKCE flow does not use a client secret in
   the browser, so it is safe for this to sit in plain client
   side code even once the site is live on GitHub Pages.

   IMPORTANT: In your Spotify Developer Dashboard app settings,
   make sure the exact redirect URI below is added to the
   Redirect URIs allowlist, or login will fail with an
   "INVALID_CLIENT: Invalid redirect URI" error.
   ============================================================ */

const SPOTIFY_CONFIG = {
  clientId: 'aa66ec1fa9cf4ee4ba74c37fc989860d',

  // This must exactly match a Redirect URI entered in your
  // Spotify app dashboard, including the protocol, host, port,
  // path, and trailing slash (or lack of one).
  redirectUri: window.location.origin + window.location.pathname.replace(/[^/]+$/, '') + 'spotify-callback.html',

  scopes: [
    'user-read-email',
    'user-read-private',
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-modify-playback-state',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' '),

  // Name used for the persistent player popup window and for
  // the BroadcastChannel the main site pages use to mirror its
  // now-playing status. Keep these the same everywhere so every
  // page talks to the same window/channel.
  playerWindowName: 'allyTripsSpotifyPlayer',
  syncChannelName: 'ally-trips-spotify-sync'
};
