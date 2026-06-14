/**
 * Routing Helper (Mobile)
 *
 * Distance/duration are computed with the Google Directions API (same data as
 * Google Maps) so the numbers match what an admin sees on maps.google.com.
 * If Google fails, it falls back to free OpenStreetMap services (Nominatim +
 * OSRM). All distances are rounded to whole kilometres (.5 up, <.5 down).
 */

// Same Google Maps key already used by the app (Places autocomplete).
const GOOGLE_KEY = "AIzaSyAqsfeARorPkCqHI61693V1YDa8Gv49SpA";
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

// ── Google Directions (origin → ...waypoints → destination) ─────────────────
async function googleRoute(addresses) {
  try {
    const list = addresses.filter(Boolean);
    if (list.length < 2) return null;
    const origin = encodeURIComponent(list[0]);
    const destination = encodeURIComponent(list[list.length - 1]);
    const mids = list.slice(1, -1).map(encodeURIComponent).join("|");
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${mids ? `&waypoints=${mids}` : ""}&key=${GOOGLE_KEY}`;
    const data = await (await fetch(url)).json();
    if (data.status === "OK" && data.routes?.[0]) {
      const legs = data.routes[0].legs || [];
      const meters = legs.reduce((s, l) => s + (l.distance?.value || 0), 0);
      const secs = legs.reduce((s, l) => s + (l.duration?.value || 0), 0);
      return { km: Math.round(meters / 1000), durationMin: Math.round(secs / 60) };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ── Geocode (used only for the OSRM fallback) ───────────────────────────────
export async function geocodeAddress(address) {
  if (!address || address === "—") return null;
  try {
    if (MAPBOX_ACCESS_TOKEN) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
      const data = await (await fetch(url)).json();
      return data.features?.[0]?.center || null;
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const data = await (await fetch(url, { headers: { "User-Agent": "FamilyForeverApp/1.0" } })).json();
    if (Array.isArray(data) && data[0]) return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function osrmRoute(addresses) {
  const coords = (await Promise.all(addresses.map((a) => geocodeAddress(a)))).filter(Boolean);
  if (coords.length < 2) return null;
  const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;
  const data = await (await fetch(url)).json();
  const route = data.routes?.[0];
  if (route) return { km: Math.round(route.distance / 1000), durationMin: Math.round(route.duration / 60) };
  return null;
}

// ── Distance + duration for a sequence of addresses ─────────────────────────
export async function calculateRouteDistance(addresses) {
  try {
    const google = await googleRoute(addresses);
    if (google) return google;
    return await osrmRoute(addresses); // fallback
  } catch (error) {
    console.error("Routing error:", error, "| addresses:", addresses);
    return null;
  }
}

// ── Reverse geocode: [lng, lat] → address string ────────────────────────────
export async function reverseGeocode(lng, lat) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`;
    const data = await (await fetch(url)).json();
    if (data.status === "OK" && data.results?.[0]) return data.results[0].formatted_address;
    const nurl = `https://nominatim.openstreetmap.org/reverse?format=json&lon=${lng}&lat=${lat}`;
    const ndata = await (await fetch(nurl, { headers: { "User-Agent": "FamilyForeverApp/1.0" } })).json();
    return ndata.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
