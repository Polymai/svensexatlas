export const APP_NAME = "Bachelor Planner";
export const BRAND_NAME = "SvensexaAtlas";
export const APP_SCHEMA = "app643_svensexaatlas";

export const SUPABASE_URL = "https://pfnlebwkbhblytpvaokd.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_O8CemBWuZAjQDC6gSkNq9Q_wAmDtHiv";

export const PUBLIC_SESSION_KEY = "app643.svensexaatlas.public";
export const VIEW_KEY = "app643.svensexaatlas.view";

export const MAP_DEFAULTS = {
  center: [59.3293, 18.0686],
  zoom: 11,
};

export function makeDraftCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}