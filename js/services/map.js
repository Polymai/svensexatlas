import { MAP_DEFAULTS } from "../config.js";

let map = null;
let activeElement = null;
let markerLayer = null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ensureMap(element) {
  if (!window.L || !element) return null;

  if (activeElement !== element) {
    destroyMap();

    activeElement = element;
    map = window.L.map(element, {
      zoomControl: true,
      scrollWheelZoom: false,
    });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    markerLayer = window.L.layerGroup().addTo(map);
    map.setView(MAP_DEFAULTS.center, MAP_DEFAULTS.zoom);
  }

  return map;
}

function makeIcon(color, label) {
  return window.L.divIcon({
    className: "marker-badge",
    html: `<span class="marker-chip"><span class="marker-dot" style="--marker:${escapeHtml(color)}"></span>${escapeHtml(label)}</span>`,
    iconSize: [120, 28],
    iconAnchor: [18, 14],
  });
}

export function renderMap(element, model = {}) {
  const instance = ensureMap(element);
  if (!instance || !markerLayer) return;

  markerLayer.clearLayers();

  const places = Array.isArray(model.places) ? model.places : [];
  const participants = Array.isArray(model.participants) ? model.participants : [];
  const bounds = [];

  places.forEach((place) => {
    if (place.lat === null || place.lng === null || place.lat === undefined || place.lng === undefined) {
      return;
    }

    const marker = window.L.marker([Number(place.lat), Number(place.lng)], {
      icon: makeIcon("#8a5a22", place.name || "Plats"),
    });

    marker.bindPopup(
      `<strong>${escapeHtml(place.name || "Plats")}</strong><br>${escapeHtml(place.address || "")}`
    );
    marker.addTo(markerLayer);
    bounds.push([Number(place.lat), Number(place.lng)]);
  });

  participants.forEach((participant) => {
    if (
      participant.lat === null ||
      participant.lng === null ||
      participant.lat === undefined ||
      participant.lng === undefined
    ) {
      return;
    }

    const marker = window.L.marker([Number(participant.lat), Number(participant.lng)], {
      icon: makeIcon(participant.color || "#1c6b63", participant.label || participant.name || "Deltagare"),
    });

    marker.bindPopup(
      `<strong>${escapeHtml(participant.label || participant.name || "Deltagare")}</strong>`
    );
    marker.addTo(markerLayer);
    bounds.push([Number(participant.lat), Number(participant.lng)]);
  });

  if (bounds.length === 1) {
    instance.setView(bounds[0], 14);
    return;
  }

  if (bounds.length > 1) {
    instance.fitBounds(bounds, {
      padding: [28, 28],
    });
    return;
  }

  instance.setView(model.center || MAP_DEFAULTS.center, model.zoom || MAP_DEFAULTS.zoom);
}

export function destroyMap() {
  if (map) {
    map.remove();
  }

  map = null;
  activeElement = null;
  markerLayer = null;
}
