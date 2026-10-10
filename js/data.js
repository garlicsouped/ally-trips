/* ============================================================
   DATA LAYER
   For now this uses localStorage as a stand in database so
   edits actually persist across reloads. The function names
   (getTrips, saveTrips, getTripById, saveTrip) are written so
   they can be swapped for real Supabase calls later without
   touching the rest of the app.
   ============================================================ */

const STORAGE_KEY = 'allyTripsData';
const SETTINGS_KEY = 'allyTripsSettings';

const SEED_TRIPS = [
  {
    id: "osaka-2026",
    name: "Osaka and Kyoto",
    destination: "Osaka, Japan",
    flagEmoji: "🇯🇵",
    startDate: "2026-11-14",
    endDate: "2026-11-19",
    coverEmoji: "🏯",
    archived: false,
    companions: [
      { id: "c1", name: "Natashia", avatarType: "sprite", avatarValue: "companion_natashia.png" },
      { id: "c2", name: "Amos", avatarType: "sprite", avatarValue: "companion_amos.png" }
    ],
    shareToken: "osaka-2026",
    flights: [
      { id: "f1", airline: "ANA", flightNumber: "NH 847", from: "SIN", to: "KIX", departTime: "2026-11-14T00:35", arriveTime: "2026-11-14T08:20", confirmation: "ZQ7F2A", done: false, lastEditedBy: "Ally" },
      { id: "f2", airline: "ANA", flightNumber: "NH 846", from: "KIX", to: "SIN", departTime: "2026-11-19T21:10", arriveTime: "2026-11-20T04:55", confirmation: "ZQ7F2A", done: false, lastEditedBy: "Ally" }
    ],
    days: [
      {
        date: "2026-11-14",
        weather: { icon: "sun", tempHighC: 18, tempLowC: 10, summary: "Clear" },
        items: [
          { id: "i1", time: "09:00", title: "Land at Kansai Airport", location: "KIX", flexibility: "must", notes: "Grab JR pass at the airport counter", done: true, lastEditedBy: "Ally" },
          { id: "i2", time: "11:00", title: "Check in at hotel", location: "Namba", flexibility: "must", notes: "", done: true, lastEditedBy: "Natashia" },
          { id: "i3", time: "14:00", title: "Dotonbori walk and street food", location: "Dotonbori", flexibility: "must", notes: "Takoyaki and okonomiyaki", done: false, lastEditedBy: "Ally" },
          { id: "i4", time: "19:00", title: "Umeda Sky Building viewpoint", location: "Umeda", flexibility: "nice", notes: "Only if not too tired", done: false, lastEditedBy: "Amos" }
        ]
      },
      {
        date: "2026-11-15",
        weather: { icon: "cloud", tempHighC: 17, tempLowC: 9, summary: "Partly cloudy" },
        items: [
          { id: "i5", time: "08:30", title: "Fushimi Inari Shrine", location: "Kyoto", flexibility: "must", notes: "Go early to beat crowds", done: false, lastEditedBy: "Ally" },
          { id: "i6", time: "13:00", title: "Lunch near Kiyomizu-dera", location: "Kyoto", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "i7", time: "15:00", title: "Kiyomizu-dera Temple", location: "Kyoto", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "i8", time: "18:00", title: "Gion district evening stroll", location: "Kyoto", flexibility: "nice", notes: "Possible geisha sighting area", done: false, lastEditedBy: "Ally" }
        ]
      },
      {
        date: "2026-11-16",
        weather: { icon: "rain", tempHighC: 15, tempLowC: 9, summary: "Light rain" },
        items: [
          { id: "i9", time: "10:00", title: "Arashiyama Bamboo Grove", location: "Kyoto", flexibility: "must", notes: "Bring umbrella", done: false, lastEditedBy: "Ally" },
          { id: "i10", time: "12:30", title: "Tenryu-ji Temple", location: "Kyoto", flexibility: "nice", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "i11", time: "16:00", title: "Return to Osaka, rest", location: "Namba", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" }
        ]
      },
      {
        date: "2026-11-17",
        weather: { icon: "sun", tempHighC: 19, tempLowC: 11, summary: "Clear" },
        items: [
          { id: "i12", time: "09:00", title: "Osaka Castle", location: "Osaka", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "i13", time: "13:00", title: "Kuromon Market food crawl", location: "Osaka", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "i14", time: "17:00", title: "Shinsaibashi shopping", location: "Shinsaibashi", flexibility: "nice", notes: "", done: false, lastEditedBy: "Ally" }
        ]
      },
      {
        date: "2026-11-18",
        weather: { icon: "cloud", tempHighC: 16, tempLowC: 10, summary: "Partly cloudy" },
        items: [
          { id: "i15", time: "09:30", title: "Universal Studios Japan", location: "Osaka", flexibility: "must", notes: "Buy express pass in advance", done: false, lastEditedBy: "Ally" }
        ]
      },
      {
        date: "2026-11-19",
        weather: { icon: "sun", tempHighC: 17, tempLowC: 10, summary: "Clear" },
        items: [
          { id: "i16", time: "10:00", title: "Last minute souvenir shopping", location: "Namba", flexibility: "nice", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "i17", time: "15:00", title: "Head to airport", location: "KIX", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "i18", time: "21:10", title: "Flight home", location: "KIX to SIN", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" }
        ]
      }
    ],
    files: [
      { id: "doc1", name: "Hotel booking confirmation.pdf", type: "pdf" },
      { id: "doc2", name: "JR Pass voucher.pdf", type: "pdf" }
    ]
  },
  {
    id: "bali-2027",
    name: "Bali Getaway",
    destination: "Bali, Indonesia",
    flagEmoji: "🇮🇩",
    startDate: "2027-02-05",
    endDate: "2027-02-09",
    coverEmoji: "🌴",
    archived: false,
    companions: [
      { id: "c3", name: "Jia", avatarType: "sprite", avatarValue: "companion_jia.png" }
    ],
    shareToken: "bali-2027",
    flights: [
      { id: "f3", airline: "Singapore Airlines", flightNumber: "SQ 938", from: "SIN", to: "DPS", departTime: "2027-02-05T07:50", arriveTime: "2027-02-05T10:40", confirmation: "KT9L3X", done: false, lastEditedBy: "Ally" },
      { id: "f4", airline: "Singapore Airlines", flightNumber: "SQ 939", from: "DPS", to: "SIN", departTime: "2027-02-09T19:30", arriveTime: "2027-02-09T22:15", confirmation: "KT9L3X", done: false, lastEditedBy: "Ally" }
    ],
    days: [
      {
        date: "2027-02-05",
        weather: { icon: "sun", tempHighC: 31, tempLowC: 25, summary: "Sunny" },
        items: [
          { id: "b1", time: "11:00", title: "Arrive and check in", location: "Seminyak", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "b2", time: "16:00", title: "Sunset at Seminyak Beach", location: "Seminyak", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" }
        ]
      },
      {
        date: "2027-02-06",
        weather: { icon: "sun", tempHighC: 32, tempLowC: 25, summary: "Sunny" },
        items: [
          { id: "b3", time: "08:00", title: "Tegallalang Rice Terraces", location: "Ubud", flexibility: "must", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "b4", time: "13:00", title: "Sacred Monkey Forest", location: "Ubud", flexibility: "nice", notes: "", done: false, lastEditedBy: "Ally" },
          { id: "b5", time: "18:00", title: "Dinner at Ubud night market", location: "Ubud", flexibility: "nice", notes: "", done: false, lastEditedBy: "Ally" }
        ]
      }
    ],
    files: []
  },
  {
    id: "seoul-2026",
    name: "Seoul Winter Trip",
    destination: "Seoul, South Korea",
    flagEmoji: "🇰🇷",
    startDate: "2026-01-12",
    endDate: "2026-01-16",
    coverEmoji: "🏮",
    archived: true,
    companions: [
      { id: "c4", name: "Priya", avatarType: "sprite", avatarValue: "companion_priya.png" }
    ],
    shareToken: "seoul-2026",
    flights: [],
    days: [],
    files: []
  }
];

const DEFAULT_SETTINGS = {
  tempUnit: "C",
  theme: "sky",
  tagStyle: "must-nice",
  soundEffects: true,
  backgroundMusic: false,
  spotifyConnected: false
};

/* ---------------- TRIP DATA ---------------- */
function loadAllTripsFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TRIPS));
    return JSON.parse(JSON.stringify(SEED_TRIPS));
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TRIPS));
    return JSON.parse(JSON.stringify(SEED_TRIPS));
  }
}

function saveAllTripsToStorage(trips) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function getTrips() {
  return loadAllTripsFromStorage();
}

function getTripById(id) {
  const trips = loadAllTripsFromStorage();
  return trips.find(t => t.id === id);
}

function saveTrip(updatedTrip) {
  const trips = loadAllTripsFromStorage();
  const idx = trips.findIndex(t => t.id === updatedTrip.id);
  if (idx >= 0) {
    trips[idx] = updatedTrip;
  } else {
    trips.push(updatedTrip);
  }
  saveAllTripsToStorage(trips);
}

function createTrip(tripData) {
  const trips = loadAllTripsFromStorage();
  const newTrip = {
    id: tripData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
    name: tripData.name,
    destination: tripData.destination,
    flagEmoji: tripData.flagEmoji || "🌍",
    startDate: tripData.startDate,
    endDate: tripData.endDate,
    coverEmoji: tripData.coverEmoji || "✈️",
    archived: false,
    companions: [],
    shareToken: tripData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
    flights: [],
    days: [],
    files: []
  };
  trips.push(newTrip);
  saveAllTripsToStorage(trips);
  return newTrip;
}

function getTripByShareToken(token) {
  const trips = loadAllTripsFromStorage();
  return trips.find(t => t.shareToken === token);
}

/* ---------------- SETTINGS ---------------- */
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
  const settings = getSettings();
  if (settings.tempUnit === 'F') {
    return Math.round(celsius * 9 / 5 + 32) + '\u00b0F';
  }
  return Math.round(celsius) + '\u00b0C';
}
