/**
 * Routing Helper (Web)
 *
 * Distance/duration are computed with the Google Maps JS DirectionsService
 * (already loaded via index.html), so the numbers match maps.google.com.
 * Falls back to free OpenStreetMap services (Nominatim + OSRM) if Google isn't
 * available. Distances are rounded to whole kilometres (.5 up, <.5 down).
 */

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// ── Google Directions via the loaded Maps JS SDK ────────────────────────────
function googleRoute(addresses) {
  return new Promise((resolve) => {
    const list = addresses.filter(Boolean);
    if (list.length < 2 || !window.google?.maps?.DirectionsService) return resolve(null);
    try {
      const ds = new window.google.maps.DirectionsService();
      const waypoints = list.slice(1, -1).map((a) => ({ location: a, stopover: true }));
      ds.route(
        {
          origin: list[0],
          destination: list[list.length - 1],
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (res, status) => {
          if (status === "OK" && res.routes?.[0]) {
            const legs = res.routes[0].legs || [];
            const meters = legs.reduce((s, l) => s + (l.distance?.value || 0), 0);
            const secs = legs.reduce((s, l) => s + (l.duration?.value || 0), 0);
            resolve({ km: Math.round(meters / 1000), durationMin: Math.round(secs / 60) });
          } else {
            resolve(null);
          }
        }
      );
    } catch (e) {
      resolve(null);
    }
  });
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
    const data = await (await fetch(url)).json();
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
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      if (res.results?.[0]) return res.results[0].formatted_address;
    }
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lon=${lng}&lat=${lat}`;
    const data = await (await fetch(url)).json();
    return data.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}
