/* ============================================================
   DATA LAYER (Supabase backed)
   Every trip is one row in the "trips" table with its entire
   nested object (companions, flights, days, items) stored in a
   single jsonb column. On page load, initDataLayer() fetches
   every trip once into an in-memory cache. All the get*()
   functions below read from that cache synchronously, exactly
   like the old localStorage version did, so trip.js, share.js,
   dashboard.js, and archive.js did not need to be rewritten,
   just wrapped to await initDataLayer() once before they run.

   saveTrip() and createTrip() update the in-memory cache
   immediately (so the UI feels instant) and fire off the actual
   Supabase write in the background. If that write fails, a
   toast lets you know so you're never silently out of sync.

   Device level preferences (temperature unit, theme, sound,
   etc) stay in localStorage, those are per-browser settings,
   not shared trip data, so there is no need to put them in the
   database.
   ============================================================ */

const SETTINGS_KEY = 'allyTripsSettings';
const LEGACY_STORAGE_KEY = 'allyTripsData';
const LEGACY_IMPORTED_KEY = 'allyTripsLegacyImported';

let tripsCache = null;
let initDataLayerPromise = null;

/* ---------------- INIT ---------------- */
function initDataLayer() {
  if (tripsCache) return Promise.resolve(tripsCache);
  if (initDataLayerPromise) return initDataLayerPromise;

  initDataLayerPromise = (async () => {
    try {
      if (!supabaseClient) throw new Error('Supabase client not initialized');
      const { data, error } = await supabaseClient.from('trips').select('data');
      if (error) throw error;
      tripsCache = (data || []).map(row => row.data);
    } catch (e) {
      console.error('Failed to load trips from Supabase', e);
      tripsCache = [];
      if (typeof showToast === 'function') {
        showToast('Could not load your trips, check your connection and refresh');
      }
    }
    return tripsCache;
  })();

  return initDataLayerPromise;
}

/* ---------------- TRIP READS (sync, from cache) ---------------- */
function getTrips() {
  return tripsCache || [];
}

function getTripById(id) {
  return (tripsCache || []).find(t => t.id === id);
}

function getTripByShareToken(token) {
  return (tripsCache || []).find(t => t.shareToken === token);
}

/* ---------------- TRIP WRITES ---------------- */
async function persistTripToSupabase(trip) {
  try {
    if (!supabaseClient) throw new Error('Supabase client not initialized');
    const { error } = await supabaseClient.from('trips').upsert({
      id: trip.id,
      share_token: trip.shareToken,
      archived: !!trip.archived,
      data: trip
    });
    if (error) throw error;
  } catch (e) {
    console.error('Failed to save trip to Supabase', e);
    if (typeof showToast === 'function') {
      showToast('Could not save your changes, check your connection and try again');
    }
  }
}

function saveTrip(updatedTrip) {
  if (!tripsCache) tripsCache = [];
  const idx = tripsCache.findIndex(t => t.id === updatedTrip.id);
  if (idx >= 0) {
    tripsCache[idx] = updatedTrip;
  } else {
    tripsCache.push(updatedTrip);
  }
  persistTripToSupabase(updatedTrip); // fire and forget, errors toast on failure
}

function createTrip(tripData) {
  const slug = tripData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  const newTrip = {
    id: slug,
    name: tripData.name,
    destination: tripData.destination,
    flagEmoji: tripData.flagEmoji || "🌍",
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    coverEmoji: tripData.coverEmoji || "✈️",
    archived: false,
    companions: [],
    shareToken: slug,
    flights: [],
    days: generateItineraryDays(tripData.startDate, tripData.endDate),
    files: []
  };

  if (!tripsCache) tripsCache = [];
  tripsCache.push(newTrip);
  persistTripToSupabase(newTrip);
  return newTrip;
}

/* ============================================================
   AUTO-POPULATED ITINERARY DAYS
   A trip's days array is generated automatically from its start
   and end date, no manual "add day" needed for a brand new trip,
   even a 20 day one. Add Day and the per-day delete button still
   work exactly as before for adjusting things afterward.
   ============================================================ */
function getDateRangeArray(startDate, endDate) {
  const dates = [];
  let cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function generateEmptyDayEntry(dateStr) {
  return {
    date: dateStr,
    weather: { icon: 'sun', tempHighC: null, tempLowC: null, summary: 'Forecast not available yet' },
    items: []
  };
}

function generateItineraryDays(startDate, endDate) {
  return getDateRangeArray(startDate, endDate).map(d => generateEmptyDayEntry(d));
}

/* Called when a trip's start/end date is edited. Adds any newly
   covered dates as empty days, and removes days that fall
   outside the new range, UNLESS that day already has itinerary
   items in it, those are kept so editing dates never silently
   deletes something you planned. */
function syncItineraryDaysToDateRange(trip, newStart, newEnd) {
  if (!trip.days) trip.days = [];
  const desiredDates = getDateRangeArray(newStart, newEnd);

  desiredDates.forEach(d => {
    if (!trip.days.some(day => day.date === d)) {
      trip.days.push(generateEmptyDayEntry(d));
    }
  });

  trip.days = trip.days.filter(day => {
    if (desiredDates.includes(day.date)) return true;
    return day.items && day.items.length > 0;
  });

  trip.days.sort((a, b) => a.date.localeCompare(b.date));
  return trip;
}

/* ============================================================
   LEGACY LOCALSTORAGE IMPORT
   Trips created before Supabase was connected live in this
   browser's localStorage and won't show up automatically now
   that trips load from a real shared database. This one-time
   import copies them over so nothing gets lost.
   ============================================================ */
function getLegacyLocalTrips() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function hasUnimportedLegacyTrips() {
  if (localStorage.getItem(LEGACY_IMPORTED_KEY) === 'true') return false;
  return getLegacyLocalTrips().length > 0;
}

async function importLegacyTripsToSupabase() {
  const legacy = getLegacyLocalTrips();
  if (legacy.length === 0) {
    localStorage.setItem(LEGACY_IMPORTED_KEY, 'true');
    return 0;
  }

  if (!tripsCache) tripsCache = [];
  let importedCount = 0;

  for (const trip of legacy) {
    const alreadyExists = tripsCache.some(t => t.id === trip.id);
    if (alreadyExists) continue;
    tripsCache.push(trip);
    await persistTripToSupabase(trip);
    importedCount++;
  }

  localStorage.setItem(LEGACY_IMPORTED_KEY, 'true');
  return importedCount;
}

/* ---------------- SETTINGS (device-level, localStorage) ---------------- */
const DEFAULT_SETTINGS = {
  tempUnit: "C",
  theme: "sky",
  tagStyle: "must-nice",
  soundEffects: true,
  backgroundMusic: false,
  spotifyConnected: false
};

function getSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    return { ...DEFAULT_SETTINGS };
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ---------------- ACTIVE EDITOR (for share link attribution) ---------------- */
function getActiveEditorForTrip(tripId) {
  return sessionStorage.getItem('editor_' + tripId) || 'Ally';
}

function setActiveEditorForTrip(tripId, name) {
  sessionStorage.setItem('editor_' + tripId, name);
}

/* ---------------- TEMPERATURE HELPER ---------------- */
function formatTemp(celsius) {
  if (celsius === null || celsius === undefined) return '--°';
  const settings = getSettings();
  if (settings.tempUnit === 'F') {
    return Math.round(celsius * 9 / 5 + 32) + '\u00b0F';
  }
  return Math.round(celsius) + '\u00b0C';
}
