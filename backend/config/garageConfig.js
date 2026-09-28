/**
 * Garage Location and Roadside Assistance Configuration
 * Configurable via environment variables with default values for Udupi showroom/garage.
 */
export const getGarageConfig = () => {
  const latitude = parseFloat(process.env.GARAGE_LATITUDE) || 13.34088;
  const longitude = parseFloat(process.env.GARAGE_LONGITUDE) || 74.74214;
  const serviceRadiusKm = parseFloat(process.env.SERVICE_RADIUS_KM) || 20;
  const garageName = process.env.GARAGE_NAME || 'Garage ERP Auto Services - Udupi';
  const address = process.env.GARAGE_ADDRESS || 'Near City Bus Stand, Service Bus Stand Road, Udupi, Karnataka 576101';
  const phone = process.env.GARAGE_PHONE || '+91 98765 43210';

  return {
    latitude,
    longitude,
    serviceRadiusKm,
    garageName,
    address,
    phone
  };
};

export default getGarageConfig;
