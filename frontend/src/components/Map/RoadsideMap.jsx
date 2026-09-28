import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateDistanceKm, DEFAULT_GARAGE_LOCATION } from '../../utils/geoUtils';
import { FaLocationArrow, FaCrosshairs, FaCheckCircle, FaExclamationTriangle, FaCompress } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './RoadsideMap.css';

const RoadsideMap = ({
  garageLocation = DEFAULT_GARAGE_LOCATION,
  selectedLocation,
  onLocationSelect,
  readOnly = false,
  height = '480px',
  otherMarkers = []
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const garageMarkerRef = useRef(null);
  const breakdownMarkerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const polylineRef = useRef(null);
  const otherMarkersGroupRef = useRef(null);

  const [locating, setLocating] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [isWithin, setIsWithin] = useState(true);

  const garageLat = Number(garageLocation.latitude) || DEFAULT_GARAGE_LOCATION.latitude;
  const garageLon = Number(garageLocation.longitude) || DEFAULT_GARAGE_LOCATION.longitude;
  const radiusKm = Number(garageLocation.serviceRadiusKm) || DEFAULT_GARAGE_LOCATION.serviceRadiusKm;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // Already initialized

    // Create Map centered at Udupi garage location
    const map = L.map(mapContainerRef.current, {
      center: [garageLat, garageLon],
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: false
    });

    // Add Zoom Control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap TileLayer with Required Attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // 1. Garage Marker (Custom Gold Icon)
    const garageIcon = L.divIcon({
      className: 'custom-leaflet-div-icon',
      html: `
        <div class="garage-marker-badge" title="${garageLocation.garageName}">
          <span>🏢</span>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
      popupAnchor: [0, -22]
    });

    const garageMarker = L.marker([garageLat, garageLon], {
      icon: garageIcon,
      zIndexOffset: 1000
    }).addTo(map);

    garageMarker.bindPopup(`
      <div style="font-family: inherit; min-width: 200px;">
        <div style="font-weight: 700; color: #f2c75c; font-size: 0.95rem; margin-bottom: 4px;">
          ${garageLocation.garageName || 'Garage ERP Auto Services - Udupi'}
        </div>
        <div style="font-size: 0.8rem; color: #a7b0aa; margin-bottom: 6px;">
          ${garageLocation.address || 'Udupi Showroom & Service Center'}
        </div>
        <div style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: rgba(217,168,62,0.18); color: #f2c75c; font-size: 0.75rem; font-weight: 600;">
          📍 Showroom & 20 km Dispatch Base
        </div>
      </div>
    `);

    garageMarkerRef.current = garageMarker;

    // 2. 20 km Service Radius Circle
    const radiusCircle = L.circle([garageLat, garageLon], {
      radius: radiusKm * 1000, // in meters
      color: '#D9A83E',
      weight: 2,
      dashArray: '6, 8',
      fillColor: '#D9A83E',
      fillOpacity: 0.08
    }).addTo(map);

    radiusCircle.bindTooltip(`20 km Roadside Assistance Coverage Area`, {
      permanent: false,
      direction: 'top'
    });

    radiusCircleRef.current = radiusCircle;

    // Layer group for other markers (used by admin overview)
    const otherGroup = L.layerGroup().addTo(map);
    otherMarkersGroupRef.current = otherGroup;

    // 3. Map Click Event -> Place or Move Breakdown Marker
    if (!readOnly) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        handlePlaceBreakdownMarker(lat, lng, map);
      });
    }

    mapInstanceRef.current = map;

    // Invalidate map size after DOM layout renders
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update garage marker & circle if coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (garageMarkerRef.current) {
      garageMarkerRef.current.setLatLng([garageLat, garageLon]);
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng([garageLat, garageLon]);
      radiusCircleRef.current.setRadius(radiusKm * 1000);
    }
  }, [garageLat, garageLon, radiusKm]);

  // Sync selected location from outside props
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (selectedLocation && selectedLocation.latitude && selectedLocation.longitude) {
      const lat = Number(selectedLocation.latitude);
      const lon = Number(selectedLocation.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        handlePlaceBreakdownMarker(lat, lon, mapInstanceRef.current, false);
      }
    }
  }, [selectedLocation?.latitude, selectedLocation?.longitude]);

  // Render any other markers (e.g. for admin map view)
  useEffect(() => {
    if (!otherMarkersGroupRef.current) return;
    otherMarkersGroupRef.current.clearLayers();

    if (otherMarkers && otherMarkers.length > 0) {
      otherMarkers.forEach((item) => {
        if (!item.location || !item.location.latitude || !item.location.longitude) return;
        const oLat = Number(item.location.latitude);
        const oLon = Number(item.location.longitude);
        if (isNaN(oLat) || isNaN(oLon)) return;

        const isDispatched = item.status === 'Dispatched' || item.status === 'In Progress';
        const color = isDispatched ? '#3B82F6' : '#EF4444';

        const customIcon = L.divIcon({
          className: 'custom-leaflet-div-icon',
          html: `
            <div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; border: 2px solid white; box-shadow: 0 0 10px ${color};">
              🚗
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([oLat, oLon], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-size: 0.85rem;">
            <div style="font-weight: 700; color: #f2c75c;">${item.requestNumber || 'Roadside Request'}</div>
            <div>Vehicle: <strong>${item.vehicle?.vehicleNumber || 'N/A'}</strong></div>
            <div>Issue: ${item.breakdownType}</div>
            <div>Status: <span style="font-weight: 600;">${item.status}</span></div>
            <div>Distance: <strong>${item.location.distanceKm || '--'} km</strong></div>
          </div>
        `);
        otherMarkersGroupRef.current.addLayer(marker);
      });
    }
  }, [otherMarkers]);

  // Place or Move Breakdown Location Marker
  const handlePlaceBreakdownMarker = (lat, lon, map, emitCallback = true) => {
    const dist = calculateDistanceKm(garageLat, garageLon, lat, lon);
    const withinRadius = dist <= radiusKm;

    setCurrentDistance(dist);
    setIsWithin(withinRadius);

    // Create or update breakdown marker
    if (!breakdownMarkerRef.current) {
      const breakdownIcon = L.divIcon({
        className: 'custom-leaflet-div-icon',
        html: `
          <div class="breakdown-marker-badge" title="Customer Breakdown Location (Drag to adjust)">
            <span>📍</span>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -22]
      });

      const marker = L.marker([lat, lon], {
        icon: breakdownIcon,
        draggable: !readOnly,
        zIndexOffset: 1200
      }).addTo(map);

      if (!readOnly) {
        marker.on('dragend', (event) => {
          const newPos = event.target.getLatLng();
          handlePlaceBreakdownMarker(newPos.lat, newPos.lng, map, true);
        });
      }

      breakdownMarkerRef.current = marker;
    } else {
      breakdownMarkerRef.current.setLatLng([lat, lon]);
    }

    // Update Popup
    breakdownMarkerRef.current.bindPopup(`
      <div style="font-family: inherit; min-width: 220px;">
        <div style="font-weight: 700; color: ${withinRadius ? '#10B981' : '#EF4444'}; font-size: 0.95rem; margin-bottom: 4px;">
          ${withinRadius ? '✔ Inside Service Area' : '⚠ Outside 20 km Area'}
        </div>
        <div style="font-size: 0.825rem; color: #FFFFFF; margin-bottom: 4px;">
          Breakdown Location
        </div>
        <div style="font-size: 0.775rem; color: #a7b0aa; margin-bottom: 6px;">
          Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)}
        </div>
        <div style="font-size: 0.85rem; font-weight: 700; color: #f2c75c;">
          ${dist} km from Udupi Garage
        </div>
        ${!readOnly ? '<div style="font-size: 0.7rem; color: #8E9891; margin-top: 4px; font-style: italic;">Drag marker or click map to move</div>' : ''}
      </div>
    `).openPopup();

    // 4. Update or Create Polyline Connection
    const polylineCoords = [
      [garageLat, garageLon],
      [lat, lon]
    ];

    if (!polylineRef.current) {
      const line = L.polyline(polylineCoords, {
        color: withinRadius ? '#10B981' : '#EF4444',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.85
      }).addTo(map);
      polylineRef.current = line;
    } else {
      polylineRef.current.setLatLngs(polylineCoords);
      polylineRef.current.setStyle({
        color: withinRadius ? '#10B981' : '#EF4444'
      });
    }

    // Call onLocationSelect prop
    if (emitCallback && onLocationSelect) {
      onLocationSelect({
        latitude: lat,
        longitude: lon,
        distanceKm: dist,
        isWithinRadius: withinRadius
      });
    }
  };

  // "Use My Current Location" via Browser Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser. Please click directly on the map to set your location.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 14, { animate: true });
          handlePlaceBreakdownMarker(latitude, longitude, mapInstanceRef.current, true);
        }
        toast.success('Your current GPS location has been placed on the map.');
      },
      (error) => {
        setLocating(false);
        console.warn('Geolocation error:', error.message);
        let msg = 'Unable to retrieve your current location. Please select your breakdown location directly on the map.';
        if (error.code === 1) {
          msg = 'Location permission was denied. Please allow location access or click your breakdown spot on the map.';
        }
        toast.info(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Center on Udupi Garage
  const handleCenterGarage = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([garageLat, garageLon], 13, { animate: true });
    }
  };

  // Fit both Garage and Breakdown in view
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const points = [[garageLat, garageLon]];
    if (breakdownMarkerRef.current) {
      points.push(breakdownMarkerRef.current.getLatLng());
    }
    const bounds = L.latLngBounds(points);
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], animate: true });
  };

  return (
    <div className="roadside-map-wrapper">
      {/* Map Control Buttons */}
      {!readOnly && (
        <div className="map-action-overlay">
          <button
            type="button"
            className="map-control-btn btn-gps"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            title="Detect GPS location of breakdown"
          >
            <FaLocationArrow className={locating ? 'fa-spin' : ''} />
            <span>{locating ? 'Locating...' : 'Use My Current Location'}</span>
          </button>

          <button
            type="button"
            className="map-control-btn"
            onClick={handleCenterGarage}
            title="Center view on Udupi Garage"
          >
            <FaCrosshairs />
            <span>Udupi Garage Base</span>
          </button>

          {currentDistance !== null && (
            <button
              type="button"
              className="map-control-btn"
              onClick={handleFitAll}
              title="Fit garage and breakdown in view"
            >
              <FaCompress />
              <span>Fit Overview</span>
            </button>
          )}
        </div>
      )}

      {/* Interactive Leaflet Map Container */}
      <div
        ref={mapContainerRef}
        className="roadside-map-container"
        style={{ height }}
      />

      {/* Floating Distance & Service Eligibility Indicator */}
      {currentDistance !== null && (
        <div className="map-distance-banner">
          <div>
            <div className="text-muted small" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Distance from Udupi Garage
            </div>
            <div className="distance-metric">
              <span className="distance-val">{currentDistance}</span>
              <span className="distance-unit">km</span>
            </div>
          </div>

          <div>
            {isWithin ? (
              <div className="d-flex align-items-center gap-2 text-success fw-bold">
                <FaCheckCircle className="fs-5" />
                <div>
                  <div style={{ fontSize: '0.9rem' }}>Within 20 km Service Radius</div>
                  <small className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Roadside assistance available</small>
                </div>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2 text-danger fw-bold">
                <FaExclamationTriangle className="fs-5" />
                <div>
                  <div style={{ fontSize: '0.9rem' }}>Outside 20 km Radius</div>
                  <small className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Exceeds maximum service boundary</small>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadsideMap;
