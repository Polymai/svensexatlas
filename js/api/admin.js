import { makeDraftCode, toIsoOrNull } from "../config.js";
import { supabase } from "../supabase/client.js";

function assertResult(result, fallbackMessage) {
  if (result.error) throw result.error;
  return result.data;
}

async function requireAdminUserId() {
  const auth = assertResult(await supabase.auth.getUser(), "Kunde inte läsa inloggad användare.");
  const userId = auth?.user?.id;

  if (!userId) {
    throw new Error("Ingen inloggad admin hittades.");
  }

  return userId;
}

function normalizeWeekendPayload(payload = {}) {
  return {
    title: String(payload.title || "").trim(),
    subtitle: String(payload.subtitle || "").trim() || null,
    city: String(payload.city || "").trim() || null,
    intro: String(payload.intro || "").trim() || null,
    sharing_message: String(payload.sharing_message || "").trim() || null,
    public_code: String(payload.public_code || makeDraftCode()).trim().toUpperCase(),
    start_at: toIsoOrNull(payload.start_at),
    end_at: toIsoOrNull(payload.end_at),
    is_published: Boolean(payload.is_published),
  };
}

function normalizePlacePayload(payload = {}) {
  return {
    weekend_id: payload.weekend_id,
    name: String(payload.name || "").trim(),
    address: String(payload.address || "").trim() || null,
    notes: String(payload.notes || "").trim() || null,
    lat:
      payload.lat === "" || payload.lat === null || payload.lat === undefined
        ? null
        : Number(payload.lat),
    lng:
      payload.lng === "" || payload.lng === null || payload.lng === undefined
        ? null
        : Number(payload.lng),
    sort_index:
      payload.sort_index === "" || payload.sort_index === null || payload.sort_index === undefined
        ? 0
        : Number(payload.sort_index),
  };
}

function normalizeActivityPayload(payload = {}) {
  return {
    weekend_id: payload.weekend_id,
    place_id: payload.place_id || null,
    title: String(payload.title || "").trim(),
    notes: String(payload.notes || "").trim() || null,
    starts_at: toIsoOrNull(payload.starts_at),
    ends_at: toIsoOrNull(payload.ends_at),
    order_index:
      payload.order_index === "" || payload.order_index === null || payload.order_index === undefined
        ? 0
        : Number(payload.order_index),
  };
}

function normalizeParticipantPayload(payload = {}) {
  return {
    weekend_id: payload.weekend_id,
    display_name: String(payload.display_name || "").trim(),
    color: String(payload.color || "").trim() || "#1c6b63",
  };
}

export async function signInAdmin({ email, password }) {
  const result = await supabase.auth.signInWithPassword({
    email: String(email || "").trim(),
    password: String(password || ""),
  });

  return assertResult(result, "Kunde inte logga in.");
}

export async function signUpAdmin({ email, password }) {
  const result = await supabase.auth.signUp({
    email: String(email || "").trim(),
    password: String(password || ""),
  });

  return assertResult(result, "Kunde inte skapa konto.");
}

export async function signOutAdmin() {
  const result = await supabase.auth.signOut();
  assertResult(result, "Kunde inte logga ut.");
  return true;
}

export async function listWeekends() {
  const result = await supabase
    .from("weekends")
    .select("id,title,city,public_code,is_published,start_at,end_at,created_at")
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  return assertResult(result, "Kunde inte läsa helger.");
}

export async function loadWeekendBundle(weekendId) {
  if (!weekendId) return null;

  const [weekendResult, placesResult, activitiesResult, participantsResult, liveResult] =
    await Promise.all([
      supabase.from("weekends").select("*").eq("id", weekendId).maybeSingle(),
      supabase
        .from("places")
        .select("*")
        .eq("weekend_id", weekendId)
        .order("sort_index", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("activities")
        .select("*")
        .eq("weekend_id", weekendId)
        .order("starts_at", { ascending: true, nullsFirst: false })
        .order("order_index", { ascending: true }),
      supabase
        .from("participants")
        .select("id,weekend_id,display_name,color,is_guest,sharing_enabled,last_seen_at,created_at")
        .eq("weekend_id", weekendId)
        .order("display_name", { ascending: true }),
      supabase
        .from("live_locations")
        .select(
          "id,participant_id,weekend_id,lat,lng,accuracy_m,heading,speed_mps,is_active,recorded_at,participant:participants(id,display_name,color,sharing_enabled,last_seen_at)"
        )
        .eq("weekend_id", weekendId)
        .order("recorded_at", { ascending: false }),
    ]);

  const weekend = assertResult(weekendResult, "Kunde inte läsa helgen.");
  const places = assertResult(placesResult, "Kunde inte läsa platser.");
  const activities = assertResult(activitiesResult, "Kunde inte läsa aktiviteter.");
  const participants = assertResult(participantsResult, "Kunde inte läsa deltagare.");
  const liveLocations = assertResult(liveResult, "Kunde inte läsa positioner.").map((row) => ({
    ...row,
    participant: Array.isArray(row.participant) ? row.participant[0] : row.participant,
  }));

  return { weekend, places, activities, participants, liveLocations };
}

export async function createWeekend(payload) {
  const next = {
    ...normalizeWeekendPayload(payload),
    owner_user_id: await requireAdminUserId(),
  };
  const result = await supabase.from("weekends").insert(next).select("*").single();
  return assertResult(result, "Kunde inte skapa helgen.");
}

export async function updateWeekend(id, payload) {
  const next = normalizeWeekendPayload(payload);
  const result = await supabase
    .from("weekends")
    .update(next)
    .eq("id", id)
    .select("*")
    .single();

  return assertResult(result, "Kunde inte spara helgen.");
}

export async function createPlace(payload) {
  const next = normalizePlacePayload(payload);
  const result = await supabase.from("places").insert(next).select("*").single();
  return assertResult(result, "Kunde inte skapa plats.");
}

export async function updatePlace(id, payload) {
  const next = normalizePlacePayload(payload);
  delete next.weekend_id;
  const result = await supabase.from("places").update(next).eq("id", id).select("*").single();
  return assertResult(result, "Kunde inte spara plats.");
}

export async function deletePlace(id) {
  const result = await supabase.from("places").delete().eq("id", id);
  assertResult(result, "Kunde inte ta bort plats.");
  return true;
}

export async function createActivity(payload) {
  const next = normalizeActivityPayload(payload);
  const result = await supabase.from("activities").insert(next).select("*").single();
  return assertResult(result, "Kunde inte skapa aktivitet.");
}

export async function updateActivity(id, payload) {
  const next = normalizeActivityPayload(payload);
  delete next.weekend_id;
  const result = await supabase
    .from("activities")
    .update(next)
    .eq("id", id)
    .select("*")
    .single();

  return assertResult(result, "Kunde inte spara aktivitet.");
}

export async function deleteActivity(id) {
  const result = await supabase.from("activities").delete().eq("id", id);
  assertResult(result, "Kunde inte ta bort aktivitet.");
  return true;
}

export async function createParticipant(payload) {
  const next = {
    ...normalizeParticipantPayload(payload),
    owner_user_id: await requireAdminUserId(),
  };
  const result = await supabase.from("participants").insert(next).select("*").single();
  return assertResult(result, "Kunde inte lägga till deltagare.");
}

export async function updateParticipant(id, payload) {
  const next = normalizeParticipantPayload(payload);
  delete next.weekend_id;
  const result = await supabase
    .from("participants")
    .update(next)
    .eq("id", id)
    .select("*")
    .single();

  return assertResult(result, "Kunde inte spara deltagare.");
}

export async function deleteParticipant(id) {
  const result = await supabase.from("participants").delete().eq("id", id);
  assertResult(result, "Kunde inte ta bort deltagare.");
  return true;
}
