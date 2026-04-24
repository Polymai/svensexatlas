import { PUBLIC_SESSION_KEY, VIEW_KEY } from "./config.js";
import * as adminApi from "./api/admin.js";
import * as publicApi from "./api/public.js";
import { supabase } from "./supabase/client.js";
import { isGeolocationSupported, startLocationStream, stopLocationStream } from "./services/geolocation.js";
import { destroyMap, renderMap } from "./services/map.js";
import {
  clearAdminData,
  clearPublicWeekend,
  getState,
  hydratePublicSession,
  setAdminActiveWeekend,
  setAdminAuthMode,
  setAdminBundle,
  setAdminDataError,
  setAdminDataLoading,
  setAdminError,
  setAdminLoading,
  setAdminNotice,
  setAdminSession,
  setAdminWeekends,
  setPublicDraft,
  setPublicError,
  setPublicIdentity,
  setPublicLoading,
  setPublicNotice,
  setPublicSharing,
  setPublicWeekend,
  setView,
  subscribe,
} from "./state/session.js";
import { renderAdminView } from "./views/admin-view.js";
import { renderPublicView } from "./views/public-view.js";

const root = document.getElementById("app");

let publicRefreshTimer = null;
let locationPushBusy = false;

function messageFromError(error, fallback) {
  return error?.message || fallback;
}

function snapshotPublicSession() {
  const publicState = getState().public;
  return {
    code: publicState.code,
    name: publicState.name,
    participantId: publicState.participantId,
    joinToken: publicState.joinToken,
    participantColor: publicState.participantColor,
  };
}

function persistLocalState() {
  const state = getState();
  localStorage.setItem(PUBLIC_SESSION_KEY, JSON.stringify(snapshotPublicSession()));
  localStorage.setItem(VIEW_KEY, state.view);
}

function restoreLocalState() {
  const rawSession = localStorage.getItem(PUBLIC_SESSION_KEY);
  const rawView = localStorage.getItem(VIEW_KEY);

  if (rawSession) {
    try {
      hydratePublicSession(JSON.parse(rawSession));
    } catch {
      hydratePublicSession({});
    }
  }

  setView(rawView === "admin" ? "admin" : "public");
}

function formDataToObject(formData) {
  return Object.fromEntries(formData.entries());
}

function buildPublicMapModel() {
  const bundle = getState().public.weekend;
  if (!bundle) return null;

  return {
    places: bundle.places,
    participants: bundle.participants
      .filter((participant) => participant.location)
      .map((participant) => ({
        lat: participant.location.lat,
        lng: participant.location.lng,
        color: participant.color,
        label: participant.display_name,
      })),
  };
}

function buildAdminMapModel() {
  const bundle = getState().admin.bundle;
  if (!bundle) return null;

  return {
    places: bundle.places,
    participants: bundle.liveLocations
      .filter((row) => row.is_active)
      .map((row) => ({
        lat: row.lat,
        lng: row.lng,
        color: row.participant?.color,
        label: row.participant?.display_name || "Deltagare",
      })),
  };
}

function refreshMap(refs) {
  if (!refs?.mapElement) {
    destroyMap();
    return;
  }

  const model = getState().view === "admin" ? buildAdminMapModel() : buildPublicMapModel();
  renderMap(refs.mapElement, model || {});
}

function render() {
  const state = getState();
  const refs =
    state.view === "admin"
      ? renderAdminView(root, state, adminHandlers)
      : renderPublicView(root, state, publicHandlers);

  refreshMap(refs);
}

async function refreshPublicWeekend({ code, name, silent = false } = {}) {
  const nextCode = String(code ?? getState().public.code ?? "").trim().toUpperCase();
  const nextName = String(name ?? getState().public.name ?? "").trim();

  if (!nextCode) {
    setPublicError("Ange en kod först.");
    return;
  }

  setPublicDraft({ code: nextCode, name: nextName });

  if (!silent) {
    setPublicLoading(true);
  }

  try {
    const bundle = await publicApi.loadPublicWeekend(nextCode);
    setPublicWeekend(bundle);
    setPublicNotice("");
  } catch (error) {
    clearPublicWeekend();
    setPublicError(messageFromError(error, "Kunde inte läsa helgen."));
  }
}

async function ensureParticipantIdentity(code, name) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    throw new Error("Skriv ditt namn innan du startar delning.");
  }

  const publicState = getState().public;

  if (publicState.joinToken && publicState.name.trim().toLowerCase() === trimmedName.toLowerCase()) {
    return {
      join_token: publicState.joinToken,
      participant_id: publicState.participantId,
      color: publicState.participantColor,
      display_name: publicState.name,
    };
  }

  const identity = await publicApi.claimParticipant(code, trimmedName);

  setPublicIdentity({
    name: identity.display_name,
    participantId: identity.participant_id,
    joinToken: identity.join_token,
    participantColor: identity.color,
  });

  return identity;
}

async function startSharingFlow({ code, name }) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  const normalizedName = String(name || "").trim();

  if (!normalizedCode) {
    setPublicError("Ladda helgen med en kod först.");
    return;
  }

  if (!isGeolocationSupported()) {
    setPublicSharing({
      status: "error",
      error: "Den här enheten stödjer inte platsdelning.",
    });
    return;
  }

  setPublicDraft({
    code: normalizedCode,
    name: normalizedName,
  });

  try {
    setPublicSharing({
      status: "starting",
      error: "",
    });

    const identity = await ensureParticipantIdentity(normalizedCode, normalizedName);

    await refreshPublicWeekend({
      code: normalizedCode,
      name: identity.display_name,
      silent: true,
    });

    startLocationStream({
      onPosition: async (position) => {
        if (locationPushBusy) return;
        locationPushBusy = true;

        try {
          const result = await publicApi.pushLiveLocation(identity.join_token, position.coords);
          setPublicSharing({
            status: "sharing",
            error: "",
            lastRecordedAt: result?.recorded_at || new Date().toISOString(),
          });
        } catch (error) {
          setPublicSharing({
            status: "error",
            error: messageFromError(error, "Kunde inte skicka positionen."),
          });
        } finally {
          locationPushBusy = false;
        }
      },
      onError: (error) => {
        const messages = {
          1: "Tillåt platsdelning i webbläsaren för att fortsätta.",
          2: "Kunde inte hämta position just nu.",
          3: "Positionen tog för lång tid att hämta.",
        };

        setPublicSharing({
          status: "error",
          error: messages[error.code] || "Kunde inte läsa enhetens position.",
        });
      },
    });
  } catch (error) {
    stopLocationStream();
    setPublicSharing({
      status: "error",
      error: messageFromError(error, "Kunde inte starta platsdelning."),
    });
  }
}

async function stopSharingFlow() {
  stopLocationStream();

  try {
    const token = getState().public.joinToken;
    if (token) {
      await publicApi.stopLiveLocation(token);
    }

    setPublicSharing({
      status: "stopped",
      error: "",
    });

    await refreshPublicWeekend({ silent: true });
  } catch (error) {
    setPublicSharing({
      status: "error",
      error: messageFromError(error, "Kunde inte stoppa platsdelningen."),
    });
  }
}

async function loadAdminBundle(weekendId) {
  if (!weekendId) {
    setAdminBundle(null);
    return;
  }

  setAdminDataLoading(true);

  try {
    const bundle = await adminApi.loadWeekendBundle(weekendId);
    setAdminBundle(bundle);
  } catch (error) {
    setAdminDataError(messageFromError(error, "Kunde inte ladda helgen."));
  }
}

async function refreshAdminWeekends(preferredId) {
  try {
    const weekends = await adminApi.listWeekends();
    setAdminWeekends(weekends);

    const currentId = preferredId || getState().admin.activeWeekendId || weekends[0]?.id || "";
    setAdminActiveWeekend(currentId);

    if (currentId) {
      await loadAdminBundle(currentId);
    } else {
      setAdminBundle(null);
    }
  } catch (error) {
    setAdminDataLoading(false);
    setAdminError(messageFromError(error, "Kunde inte läsa adminlistan."));
  }
}

function ensureRefreshTimer() {
  const hasCode = Boolean(getState().public.code);

  if (hasCode && !publicRefreshTimer) {
    publicRefreshTimer = window.setInterval(() => {
      const publicState = getState().public;
      if (publicState.code) {
        refreshPublicWeekend({
          code: publicState.code,
          name: publicState.name,
          silent: true,
        });
      }
    }, 45000);
  }

  if (!hasCode && publicRefreshTimer) {
    clearInterval(publicRefreshTimer);
    publicRefreshTimer = null;
  }
}

const publicHandlers = {
  goAdmin() {
    setView("admin");
  },
  goPublic() {
    setView("public");
  },
  async loadWeekend({ code, name }) {
    await refreshPublicWeekend({ code, name, silent: false });
  },
  async refreshWeekend({ code, name }) {
    await refreshPublicWeekend({ code, name, silent: false });
  },
  async startSharing({ code, name }) {
    await startSharingFlow({ code, name });
  },
  async stopSharing() {
    await stopSharingFlow();
  },
};

const adminHandlers = {
  goPublic() {
    setView("public");
  },
  toggleAuthMode() {
    const next = getState().admin.authMode === "signin" ? "signup" : "signin";
    setAdminAuthMode(next);
  },
  async submitAuth({ email, password, mode }) {
    setAdminLoading(true);

    try {
      if (mode === "signup") {
        const data = await adminApi.signUpAdmin({ email, password });
        setAdminLoading(false);

        if (!data.session) {
          setAdminNotice("Konto skapat. Bekräfta e-postadressen och logga sedan in.");
          setAdminAuthMode("signin");
          return;
        }

        setAdminNotice("Konto skapat och inloggat.");
        setView("admin");
        return;
      }

      await adminApi.signInAdmin({ email, password });
      setAdminLoading(false);
      setAdminNotice("Inloggad.");
      setView("admin");
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte logga in."));
    }
  },
  async logout() {
    try {
      await adminApi.signOutAdmin();
      clearAdminData();
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte logga ut."));
    }
  },
  async selectWeekend(id) {
    setAdminActiveWeekend(id);
    await loadAdminBundle(id);
  },
  async createWeekend(formData) {
    const payload = formDataToObject(formData);
    payload.title = String(payload.title || "").trim();

    if (!payload.title) {
      setAdminError("Titel krävs för att skapa en helg.");
      return;
    }

    setAdminDataLoading(true);

    try {
      const created = await adminApi.createWeekend(payload);
      setAdminNotice("Helgen skapades.");
      await refreshAdminWeekends(created.id);
    } catch (error) {
      setAdminDataLoading(false);
      setAdminError(messageFromError(error, "Kunde inte skapa helgen."));
    }
  },
  async updateWeekend({ id, formData }) {
    try {
      const values = formDataToObject(formData);
      values.is_published = formData.get("is_published") === "on";
      await adminApi.updateWeekend(id, values);
      setAdminNotice("Helgen sparades.");
      await refreshAdminWeekends(id);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte spara helgen."));
    }
  },
  async createPlace(formData) {
    try {
      const payload = formDataToObject(formData);
      payload.weekend_id = getState().admin.activeWeekendId;
      await adminApi.createPlace(payload);
      setAdminNotice("Platsen lades till.");
      await loadAdminBundle(payload.weekend_id);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte skapa plats."));
    }
  },
  async updatePlace({ id, formData }) {
    try {
      const payload = formDataToObject(formData);
      payload.weekend_id = getState().admin.activeWeekendId;
      await adminApi.updatePlace(id, payload);
      setAdminNotice("Platsen sparades.");
      await loadAdminBundle(getState().admin.activeWeekendId);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte spara plats."));
    }
  },
  async deletePlace(id) {
    try {
      await adminApi.deletePlace(id);
      setAdminNotice("Platsen togs bort.");
      await loadAdminBundle(getState().admin.activeWeekendId);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte ta bort plats."));
    }
  },
  async createActivity(formData) {
    try {
      const payload = formDataToObject(formData);
      payload.weekend_id = getState().admin.activeWeekendId;
      await adminApi.createActivity(payload);
      setAdminNotice("Aktiviteten lades till.");
      await loadAdminBundle(payload.weekend_id);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte skapa aktivitet."));
    }
  },
  async updateActivity({ id, formData }) {
    try {
      const payload = formDataToObject(formData);
      payload.weekend_id = getState().admin.activeWeekendId;
      await adminApi.updateActivity(id, payload);
      setAdminNotice("Aktiviteten sparades.");
      await loadAdminBundle(getState().admin.activeWeekendId);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte spara aktivitet."));
    }
  },
  async deleteActivity(id) {
    try {
      await adminApi.deleteActivity(id);
      setAdminNotice("Aktiviteten togs bort.");
      await loadAdminBundle(getState().admin.activeWeekendId);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte ta bort aktivitet."));
    }
  },
  async createParticipant(formData) {
    try {
      const payload = formDataToObject(formData);
      payload.weekend_id = getState().admin.activeWeekendId;
      await adminApi.createParticipant(payload);
      setAdminNotice("Deltagaren lades till.");
      await loadAdminBundle(payload.weekend_id);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte skapa deltagare."));
    }
  },
  async updateParticipant({ id, formData }) {
    try {
      const payload = formDataToObject(formData);
      payload.weekend_id = getState().admin.activeWeekendId;
      await adminApi.updateParticipant(id, payload);
      setAdminNotice("Deltagaren sparades.");
      await loadAdminBundle(getState().admin.activeWeekendId);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte spara deltagare."));
    }
  },
  async deleteParticipant(id) {
    try {
      await adminApi.deleteParticipant(id);
      setAdminNotice("Deltagaren togs bort.");
      await loadAdminBundle(getState().admin.activeWeekendId);
    } catch (error) {
      setAdminError(messageFromError(error, "Kunde inte ta bort deltagare."));
    }
  },
};

async function init() {
  subscribe(() => {
    persistLocalState();
    ensureRefreshTimer();
    render();
  });

  restoreLocalState();

  const { data } = await supabase.auth.getSession();
  setAdminSession(data.session || null);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    setAdminSession(session || null);

    if (session) {
      await refreshAdminWeekends();
      return;
    }

    clearAdminData();
  });

  if (data.session) {
    await refreshAdminWeekends();
  }

  if (getState().public.code) {
    await refreshPublicWeekend({
      code: getState().public.code,
      name: getState().public.name,
      silent: false,
    });
  }

  render();
}

init();
