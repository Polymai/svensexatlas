let watchId = null;

export function isGeolocationSupported() {
  return "geolocation" in navigator;
}

export function startLocationStream({ onPosition, onError }) {
  if (!isGeolocationSupported()) {
    throw new Error("Den här enheten stödjer inte platsdelning.");
  }

  stopLocationStream();

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (typeof onPosition === "function") {
        onPosition(position);
      }
    },
    (error) => {
      if (typeof onError === "function") {
        onError(error);
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 12000,
      timeout: 15000,
    }
  );

  return watchId;
}

export function stopLocationStream() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}