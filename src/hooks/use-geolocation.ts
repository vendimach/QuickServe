import { useState, useCallback } from "react";

export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
  label?: string;
}

export const useGeolocation = () => {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported");
      return Promise.reject(new Error("Geolocation not supported"));
    }
    setLoading(true);
    setError(null);
    return new Promise<GeoCoords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c: GeoCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            label: `Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`,
          };
          setCoords(c);
          setLoading(false);
          resolve(c);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });
  }, []);

  return { coords, loading, error, fetchLocation };
};
