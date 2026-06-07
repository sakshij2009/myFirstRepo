/**
 * Mapbox Routing Helper
 * Uses Mapbox Geocoding + Directions API for route distance and duration.
 */

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/**
 * Geocode an address string to [lng, lat] using Mapbox.
 */
export async function geocodeAddress(address) {
  if (!address || address === "—") return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].center; // [longitude, latitude]
    }
    return null;
  } catch (error) {
    console.error("Mapbox Geocoding Error:", error);
    return null;
  }
}

/**
 * Reverse geocode [lng, lat] to an address string using Mapbox.
 */
export async function reverseGeocode(lng, lat) {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0].place_name;
    }
    return null;
  } catch (error) {
    console.error("Mapbox Reverse Geocoding Error:", error);
    return null;
  }
}

/**
 * Calculate distance and duration for a sequence of addresses.
 * @param {string[]} addresses - [origin, ...waypoints, destination]
 * @returns {Promise<{km: number, durationMin: number} | null>}
 */
export async function calculateRouteDistance(addresses) {
  try {
    const coordPromises = addresses.map(addr => geocodeAddress(addr));
    const coords = await Promise.all(coordPromises);

    const validCoords = coords.filter(c => c !== null);
    if (validCoords.length < 2) {
      console.warn("Mapbox: not enough valid coordinates from addresses:", addresses, "→", coords);
      return null;
    }

    const coordString = validCoords.map(c => `${c[0]},${c[1]}`).join(";");
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?access_token=${MAPBOX_ACCESS_TOKEN}&overview=false&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.message) {
      console.error("Mapbox Directions API error:", data.message, "| addresses:", addresses);
      return null;
    }

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        km: parseFloat((route.distance / 1000).toFixed(2)),
        durationMin: Math.round(route.duration / 60),
      };
    }
    return null;
  } catch (error) {
    console.error("Mapbox Routing Error:", error, "| addresses:", addresses);
    return null;
  }
}
