# Ally Trips

A cute pixel art travel planner front end. Plan multiple trips, build a day by day hour by hour itinerary, track flights, add travel companions, share trips with friends via link, and keep completed trips in an archive.

## Running it locally

No build step needed, it is plain HTML CSS and JavaScript. Serve it with any static server, for example:

```
python -m http.server 8000
```

Then visit http://localhost:8000/index.html

Note, it uses localStorage as a stand in database so your edits actually save and persist across reloads on the same browser. This will be swapped for Supabase in a later phase.

## File structure

```
index.html          dashboard, lists upcoming trips
trip.html           trip detail page for the owner, full edit access
share.html           trip detail page for companions via share link, identity gated
archive.html         completed trips, nothing is ever deleted
settings.html        temperature unit, theme, tag style, sound, music, sprite gallery
css/style.css        all styling, pixel theme, four color themes
js/data.js            data layer, localStorage backed, same function names as a future Supabase layer
js/common.js          shared helpers, toast, theme, mascot walk cycle
js/sound.js           synthesized 8-bit sound effects and chiptune background music
js/dashboard.js       renders trip cards, handles new trip creation
js/trip.js            owner trip detail logic, edit trip, mark complete, share, companions, flights, itinerary
js/share.js           companion facing trip detail logic with identity gate and attribution
js/archive.js         renders archived trip cards
js/settings.js        settings page logic
assets/icons/         pixel art icons
assets/sprites/       companion avatars and mascot walk cycle frames
assets/progress/      countdown tracker sprite
```

## What is still placeholder

- All trip data lives in localStorage seeded from js/data.js, not a real shared database yet
- Weather shown on each day is hardcoded sample data, not a live forecast
- Companion sprites are simple placeholder pixel avatars for now, these can be swapped for custom generated character art in a follow up pass
- Reference file upload is not wired up yet, it shows a toast message
- Spotify login is intentionally deferred to its own phase since it needs a developer account and redirect URI setup from you

## Spotify setup (one time)

Spotify integration is already built in (js/spotify-config.js, js/spotify-auth.js, js/spotify-player.js, spotify-callback.html). To make it work you need to add a Redirect URI in your Spotify Developer Dashboard app settings:

1. Go to your app in the Spotify Developer Dashboard, open Settings
2. Under Redirect URIs, add the exact URL where spotify-callback.html will be hosted, for example `http://127.0.0.1:8000/spotify-callback.html` while testing locally, and later your GitHub Pages URL plus `/spotify-callback.html` once it's live
3. Save. That's it, no other Spotify dashboard setup needed

Requires a Spotify Premium account to actually play audio (Spotify's restriction, not this app's). The Settings page is only for connecting or disconnecting your account.

**How playback now survives page navigation**

Ally Trips is a plain multi page site, so earlier versions lost playback every time you clicked to a new page because the whole tab reloaded. To fix that properly, the actual player now lives in its own separate browser window (`spotify-player-window.html`), opened via the floating music icon in the top-right corner of the dashboard, trip detail, and archive pages. Since that window is a completely separate document from the page you're browsing, navigating around the main site never touches it, playback just keeps going.

The small widget on every page stays in sync with that player window using the BroadcastChannel API, showing what's currently playing and basic play/pause/skip/volume controls, without needing to alt-tab over to the player window itself. Clicking "Open Player" again from any page focuses the same window rather than opening a second one.

Two things worth knowing:
- If your browser blocks the player window as a popup the first time, just allow popups for the site once, it'll open normally after that
- If you connected Spotify before playlist support was added, you'll see a "reconnect needed" message in the playlists panel. Just disconnect and reconnect once from Settings to grant that permission

## Next steps (future phases)

1. Set up a Supabase project with tables for trips, companions, flights, itinerary items, and a storage bucket for files
2. Add Supabase Auth with Row Level Security so only you can see and manage your own data
3. Replace the localStorage functions in js/data.js with real Supabase queries, the function names are already written to make this swap straightforward
4. Connect a weather API (Open-Meteo recommended, free and no API key needed) for each itinerary day
5. Deploy to GitHub Pages, then add the production spotify-callback.html URL as a second Redirect URI in the Spotify Dashboard
