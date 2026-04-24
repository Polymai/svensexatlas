import { supabase } from "../supabase/client.js";

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function normalizeBundle(data) {
  if (!data || !data.weekend) {
    return null;
  }

  return {
    weekend: data.weekend,
    places: Array.isArray(data.places) ? data.places : [],
    activities: Array.isArray(data.activities) ? data.activities : [],
    participants: Array.isArray(data.participants) ? data.participants : [],
  };
}

export async function loadPublicWeekend(code) {
  const normalized = normalizeCode(code);

  if (!normalized) {
    throw new Error("Ange en kod först.");
  }

  const { data, error } = await supabase.rpc("get_public_weekend", {
    p_code: normalized,
  });

  if (error) throw error;

  const bundle = normalizeBundle(data);

  if (!bundle) {
    throw new Error("Ingen publicerad helg hittades för koden.");
  }

  return bundle;
}

export async function claimParticipant(code, name) {
  const normalizedCode = normalizeCode(code);
  const normalizedName = String(name || "").trim();

  if (!normalizedCode || !normalizedName) {
    throw new Error("Både kod och namn behövs.");
  }

  const { data, error } = await supabase.rpc("claim_participant", {
    p_code: normalizedCode,
    p_name: normalizedName,
  });

  if (error) throw error;
  if (!data?.join_token) {
    throw new Error("Kunde inte koppla namnet till helgen.");
  }

  return data;
}

export async function pushLiveLocation(joinToken, coords) {
  const token = String(joinToken || "").trim();

  if (!token) {
    throw new Error("Ingen deltagarsession är aktiv.");
  }

  const { data, error } = await supabase.rpc("touch_location", {
    p_join_token: token,
    p_lat: Number(coords.latitude),
    p_lng: Number(coords.longitude),
    p_accuracy_m:
      coords.accuracy === null || coords.accuracy === undefined
        ? null
        : Number(coords.accuracy),
    p_heading:
      coords.heading === null || coords.heading === undefined
        ? null
        : Number(coords.heading),
    p_speed_mps:
      coords.speed === null || coords.speed === undefined
        ? null
        : Number(coords.speed),
  });

  if (error) throw error;
  return data;
}

export async function stopLiveLocation(joinToken) {
  const token = String(joinToken || "").trim();

  if (!token) {
    return false;
  }

  const { data, error } = await supabase.rpc("stop_sharing", {
    p_join_token: token,
  });

  if (error) throw error;
  return Boolean(data);
}