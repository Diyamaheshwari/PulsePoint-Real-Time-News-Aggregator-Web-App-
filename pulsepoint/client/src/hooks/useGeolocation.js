import { useState, useEffect } from 'react';

export const useGeolocation = (options = {}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Default coordinates (e.g. Times Square, NY) as fallback
  const [coordinates, setCoordinates] = useState({
    latitude: 40.758895,
    longitude: -73.985131,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    const handleSuccess = (position) => {
      setCoordinates({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setError(null);
      setLoading(false);
    };

    const handleError = (err) => {
      setError(err.message);
      setLoading(false);
      // Fallback stays as default
    };

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);

    // Watch position if option provided
    let watchId;
    if (options.watch) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions);
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [options.watch]);

  return { coordinates, error, loading };
};

export default useGeolocation;
