/**
 * Routing Helper (Mobile)
 *
 * Works WITHOUT any API token by default using free OpenStreetMap services:
 *   - Geocoding via Nominatim (nominatim.openstreetmap.org)
 *   - Driving distance via OSRM (router.project-osrm.org)
 * If EXPO_PUBLIC_MAPBOX_TOKEN is set, Mapbox is used instead (more accurate /
 * higher rate limits). All distances are rounded to whole kilometres
 * (.5 rounds up, <.5 rounds down).
 */

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const USE_MAPBOX = !!MAPBOX_ACCESS_TOKEN;

// ── Geocode: address string → [lng, lat] ────────────────────────────────────
export async function geocodeAddress(address) {
  if (!address || address === "—") return null;
  try {
    if (USE_MAPBOX) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
      const data = await (await fetch(url)).json();
      return data.features?.[0]?.center || null; // [lng, lat]
    }
    // Nominatim (free, no token)
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const data = await (await fetch(url, { headers: { "User-Agent": "FamilyForeverApp/1.0" } })).json();
    if (Array.isArray(data) && data[0]) return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// ── Distance + duration for a sequence of addresses ─────────────────────────
// Returns { km, durationMin } with km rounded to a whole number.
export async function calculateRouteDistance(addresses) {
  try {
    const coords = (await Promise.all(addresses.map((a) => geocodeAddress(a)))).filter(Boolean);
    if (coords.length < 2) {
      console.warn("Route: not enough geocoded coordinates from", addresses);
      return null;
    }
    const coordString = coords.map((c) => `${c[0]},${c[1]}`).join(";");

    if (USE_MAPBOX) {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?access_token=${MAPBOX_ACCESS_TOKEN}&overview=false`;
      const data = await (await fetch(url)).json();
      const route = data.routes?.[0];
      if (route) return { km: Math.round(route.distance / 1000), durationMin: Math.round(route.duration / 60) };
      return null;
    }

    // OSRM (free, no token)
    const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=false`;
    const data = await (await fetch(url)).json();
    const route = data.routes?.[0];
    if (route) return { km: Math.round(route.distance / 1000), durationMin: Math.round(route.duration / 60) };
    return null;
  } catch (error) {
    console.error("Routing error:", error, "| addresses:", addresses);
    return null;
  }
}

// ── Reverse geocode: [lng, lat] → address string ────────────────────────────
export async function reverseGeocode(lng, lat) {
  try {
    if (USE_MAPBOX) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
      const data = await (await fetch(url)).json();
      return data.features?.[0]?.place_name || null;
    }
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lon=${lng}&lat=${lat}`;
    const data = await (await fetch(url, { headers: { "User-Agent": "FamilyForeverApp/1.0" } })).json();
    return data.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
