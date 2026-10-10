/* ============================================================
   WEATHER (Open-Meteo integration)
   Free, no API key needed. Geocodes the trip destination once
   (cached in localStorage so repeat trips to the same place
   don't re-geocode), then pulls a daily forecast for any
   itinerary day that falls within Open-Meteo's reliable ~15 day
   forecast window. Days further out keep the "Forecast not
   available yet" placeholder until they fall inside that
   window, at which point this fills them in automatically the
   next time the trip page loads.
   ============================================================ */

const WEATHER_GEOCODE_CACHE_KEY = 'allyTripsGeocodeCache';
const WEATHER_FORECAST_WINDOW_DAYS = 15;
const WEATHER_STALE_MS = 3 * 60 * 60 * 1000; // refresh if older than 3 hours

function getGeocodeCache() {
  try {
    return JSON.parse(localStorage.getItem(WEATHER_GEOCODE_CACHE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveGeocodeCache(cache) {
  localStorage.setItem(WEATHER_GEOCODE_CACHE_KEY, JSON.stringify(cache));
}

async function geocodeDestination(destination) {
  const cache = getGeocodeCache();
  if (cache[destination]) return cache[destination];

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({
      name: destination,
      count: 1
    })}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    const coords = { lat: data.results[0].latitude, lon: data.results[0].longitude };
    cache[destination] = coords;
    saveGeocodeCache(cache);
    return coords;
  } catch (e) {
    return null;
  }
}

/* Open-Meteo returns WMO weather codes. This app only has sun,
   cloud, and rain icons, so every code gets bucketed into one
   of those three. */
function mapWeatherCodeToIcon(code) {
  if (code === 0 || code === 1) return 'sun';
  if ([2, 3, 45, 48].includes(code)) return 'cloud';
  return 'rain'; // drizzle, rain, snow, showers, thunderstorms
}

/* Updates trip.days in place with live forecast data where
   available. Returns true if anything changed, so the caller
   knows whether to persist and re-render. Never throws, fails
   quietly if the destination can't be geocoded or the API is
   unreachable, since weather is a nice-to-have, not critical. */
async function refreshTripWeather(trip) {
  if (!trip || !trip.days || trip.days.length === 0) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxForecastDate = new Date(today);
  maxForecastDate.setDate(maxForecastDate.getDate() + WEATHER_FORECAST_WINDOW_DAYS);

  const daysNeedingWeather = trip.days.filter(day => {
    const d = new Date(day.date + 'T00:00:00');
    if (d < today || d > maxForecastDate) return false;
    if (day.weather && day.weather.updatedAt && (Date.now() - day.weather.updatedAt) < WEATHER_STALE_MS) return false;
    return true;
  });

  if (daysNeedingWeather.length === 0) return false;

  const coords = await geocodeDestination(trip.destination);
  if (!coords) return false;

  const sortedDates = daysNeedingWeather.map(d => d.date).sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

  try {
    const url = `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
      latitude: coords.lat,
      longitude: coords.lon,
      daily: 'weathercode,temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
      start_date: startDate,
      end_date: endDate
    })}`;
    const res = await fetch(url);
    if (!res.ok) return false;

    const data = await res.json();
    if (!data.daily || !data.daily.time) return false;

    let updated = false;
    data.daily.time.forEach((dateStr, i) => {
      const day = trip.days.find(d => d.date === dateStr);
      if (!day) return;
      day.weather = {
        icon: mapWeatherCodeToIcon(data.daily.weathercode[i]),
        tempHighC: Math.round(data.daily.temperature_2m_max[i]),
        tempLowC: Math.round(data.daily.temperature_2m_min[i]),
        summary: 'Live forecast',
        updatedAt: Date.now()
      };
      updated = true;
    });

    return updated;
  } catch (e) {
    return false;
  }
}
