/**
 * Geographic utilities for roadside assistance calculations
 */

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 (in degrees)
 * @param {number} lon1 Longitude of point 1 (in degrees)
 * @param {number} lat2 Latitude of point 2 (in degrees)
 * @param {number} lon2 Longitude of point 2 (in degrees)
 * @returns {number} Distance in kilometers rounded to 2 decimal places
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const p1Lat = Number(lat1);
  const p1Lon = Number(lon1);
  const p2Lat = Number(lat2);
  const p2Lon = Number(lon2);

  if (isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon)) {
    throw new Error('Invalid coordinates passed to calculateDistanceKm');
  }

  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in kilometers

  const dLat = toRad(p2Lat - p1Lat);
  const dLon = toRad(p2Lon - p1Lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1Lat)) *
      Math.cos(toRad(p2Lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
};

/**
 * Validates if coordinates are valid decimal latitude and longitude.
 */
export const isValidCoordinate = (lat, lon) => {
  const nLat = Number(lat);
  const nLon = Number(lon);
  if (isNaN(nLat) || isNaN(nLon)) return false;
  if (nLat < -90 || nLat > 90) return false;
  if (nLon < -180 || nLon > 180) return false;
  return true;
};
