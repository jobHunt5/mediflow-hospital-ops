import { useEffect, useRef, useState } from 'react';

// Monash Medical Centre, Clayton — geocoded real-world coordinates (verified
// against OpenStreetMap). Used only for real-world distance/geofencing (are
// you near the hospital, how far away, how fast are you moving) — NOT for
// plotting a position on the in-app floor plan, since that map is hand-drawn
// and doesn't preserve real angles/proportions closely enough to project
// GPS onto it without misleading people about where the dot actually is.
export const HOSPITAL = { lat: -37.9207195, lon: 145.1236105 };
// Real hospital campuses span a couple hundred metres, and GPS itself has
// real error, so "at the hospital" is a radius, not a point.
export const GEOFENCE_M = 300;

const toRad = (deg) => (deg * Math.PI) / 180;
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Live GPS tracking — real device location, real speed, real distance to
 * the hospital. Only watches position while `active` is true (caller should
 * pass this only while the relevant screen is open, both for battery and
 * because there's no reason to track someone's location anywhere else in
 * the app).
 */
export function useGeolocation(active) {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [state, setState] = useState({
    status: 'idle', // idle | requesting | granted | denied | error | unsupported
    position: null, // { lat, lon, accuracy }
    speedKmh: null,
    distanceToHospitalM: null,
    atHospital: false,
    error: null,
  });
  const historyRef = useRef([]); // recent { lat, lon, t } fixes, for smoothing speed past GPS jitter
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      historyRef.current = [];
      return;
    }
    if (!supported) { setState(s => ({ ...s, status: 'unsupported' })); return; }

    setState(s => ({ ...s, status: 'requesting' }));

    const onPos = (pos) => {
      const { latitude: lat, longitude: lon, accuracy, speed } = pos.coords;
      const t = pos.timestamp;
      const hist = historyRef.current;
      hist.push({ lat, lon, t });
      while (hist.length > 5) hist.shift();

      // A single-step delta is dominated by GPS jitter at walking pace, so
      // derive speed from the oldest-to-newest fix across a short window.
      let derivedKmh = null;
      if (hist.length >= 2) {
        const a = hist[0], b = hist[hist.length - 1];
        const dt = (b.t - a.t) / 1000;
        if (dt > 1) derivedKmh = (haversineM(a.lat, a.lon, b.lat, b.lon) / dt) * 3.6;
      }
      const browserKmh = typeof speed === 'number' && speed >= 0 ? speed * 3.6 : null;
      const speedKmh = derivedKmh != null ? derivedKmh : browserKmh;
      const distanceToHospitalM = haversineM(lat, lon, HOSPITAL.lat, HOSPITAL.lon);

      setState({
        status: 'granted',
        position: { lat, lon, accuracy },
        speedKmh,
        distanceToHospitalM,
        atHospital: distanceToHospitalM <= GEOFENCE_M,
        error: null,
      });
    };
    const onErr = (err) => {
      setState(s => ({ ...s, status: err.code === err.PERMISSION_DENIED ? 'denied' : 'error', error: err.message }));
    };
    watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true, maximumAge: 5000, timeout: 15000,
    });
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [active, supported]);

  return { supported, ...state };
}
