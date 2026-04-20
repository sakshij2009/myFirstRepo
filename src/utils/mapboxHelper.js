/**
 * Mapbox Routing Helper
 * Replaces Google Distance Matrix API with Mapbox Directions/Matrix API.
 * Mapbox offers a generous free tier of up to 100,000 free requests per month.
 */

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

/**
 * Geocode an address string to [lng, lat] coordinates using Mapbox.
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
 * Replaces Google's DistanceMatrixService.
 * @param {string[]} addresses - List of address strings (e.g., [Office, Pickup, Drop, Office])
 * @returns {Promise<{km: number, durationMin: number} | null>}
 */
export async function calculateRouteDistance(addresses) {
  try {
    // 1. Geocode all addresses to coordinates
    const coordPromises = addresses.map(addr => geocodeAddress(addr));
    const coords = await Promise.all(coordPromises);

    // Filter out any failed geocoding results
    const validCoords = coords.filter(c => c !== null);
    if (validCoords.length < 2) return null;

    // 2. Build coordinate string for Mapbox Directions API: "lng,lat;lng,lat;..."
    const coordString = validCoords.map(c => `${c[0]},${c[1]}`).join(";");

    // 3. Call Mapbox Directions API (Optimized for sequence)
    const url = `https://api.mapbox.com/directions/v1/mapbox/driving/${coordString}?access_token=${MAPBOX_ACCESS_TOKEN}&overview=false&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        km: Math.round(route.distance / 1000),         // distance is in meters
        durationMin: Math.round(route.duration / 60)   // duration is in seconds
      };
    }
    return null;
  } catch (error) {
    console.error("Mapbox Routing Error:", error);
    return null;
  }
}
