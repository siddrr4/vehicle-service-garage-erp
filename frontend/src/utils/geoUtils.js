/**
 * Geographic utility functions for frontend Leaflet Map & Roadside Assistance
 */

// Default Udupi showroom/garage coordinates and 20 km service radius
export const DEFAULT_GARAGE_LOCATION = {
  latitude: 13.34088,
  longitude: 74.74214,
  serviceRadiusKm: 20,
  garageName: 'Garage ERP Auto Services - Udupi',
  address: 'Near City Bus Stand, Service Bus Stand Road, Udupi, Karnataka 576101',
  phone: '+91 98765 43210'
};

/**
 * Calculates great-circle distance between two coordinates using the Haversine formula.
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
    return 0;
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
 * Checks whether a given coordinate is within the service radius from the garage.
 */
export const isWithinServiceRadius = (
  breakdownLat,
  breakdownLon,
  garageLat = DEFAULT_GARAGE_LOCATION.latitude,
  garageLon = DEFAULT_GARAGE_LOCATION.longitude,
  radiusKm = DEFAULT_GARAGE_LOCATION.serviceRadiusKm
) => {
  const distance = calculateDistanceKm(garageLat, garageLon, breakdownLat, breakdownLon);
  return distance <= radiusKm;
};
