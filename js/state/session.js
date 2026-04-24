const listeners = new Set();

const initialPublic = () => ({
  code: "",
  name: "",
  weekend: null,
  loading: false,
  error: "",
  notice: "",
  participantId: "",
  joinToken: "",
  participantColor: "",
  sharingStatus: "idle",
  shareError: "",
  lastRecordedAt: "",
});

const initialAdmin = () => ({
  session: null,
  authMode: "signin",
  loading: false,
  error: "",
  notice: "",
  weekends: [],
  activeWeekendId: "",
  bundle: null,
  dataLoading: false,
  dataError: "",
});

const state = {
  view: "public",
  public: initialPublic(),
  admin: initialAdmin(),
};

function emit() {
  listeners.forEach((listener) => listener(state));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function setView(view) {
  state.view = view === "admin" ? "admin" : "public";
  emit();
}

export function hydratePublicSession(snapshot = {}) {
  state.public.code = snapshot.code || "";
  state.public.name = snapshot.name || "";
  state.public.participantId = snapshot.participantId || "";
  state.public.joinToken = snapshot.joinToken || "";
  state.public.participantColor = snapshot.participantColor || "";
  state.public.sharingStatus = "idle";
  state.public.shareError = "";
  state.public.lastRecordedAt = "";
  emit();
}

export function setPublicDraft(patch = {}) {
  if (patch.code !== undefined) state.public.code = patch.code;
  if (patch.name !== undefined) state.public.name = patch.name;
  emit();
}

export function setPublicLoading(loading) {
  state.public.loading = Boolean(loading);
  if (loading) {
    state.public.error = "";
    state.public.notice = "";
  }
  emit();
}

export function setPublicWeekend(weekend) {
  state.public.weekend = weekend;
  state.public.loading = false;
  state.public.error = "";
  emit();
}

export function setPublicError(message) {
  state.public.loading = false;
  state.public.error = message || "";
  if (message) state.public.notice = "";
  emit();
}

export function setPublicNotice(message) {
  state.public.notice = message || "";
  if (message) state.public.error = "";
  emit();
}

export function setPublicIdentity(identity = {}) {
  if (identity.name !== undefined) state.public.name = identity.name;
  if (identity.participantId !== undefined) {
    state.public.participantId = identity.participantId;
  }
  if (identity.joinToken !== undefined) state.public.joinToken = identity.joinToken;
  if (identity.participantColor !== undefined) {
    state.public.participantColor = identity.participantColor;
  }
  emit();
}

export function setPublicSharing(patch = {}) {
  if (patch.status !== undefined) state.public.sharingStatus = patch.status;
  if (patch.error !== undefined) state.public.shareError = patch.error;
  if (patch.lastRecordedAt !== undefined) {
    state.public.lastRecordedAt = patch.lastRecordedAt;
  }
  emit();
}

export function clearPublicWeekend() {
  state.public.weekend = null;
  state.public.loading = false;
  emit();
}

export function setAdminAuthMode(mode) {
  state.admin.authMode = mode === "signup" ? "signup" : "signin";
  emit();
}

export function setAdminLoading(loading) {
  state.admin.loading = Boolean(loading);
  if (loading) {
    state.admin.error = "";
    state.admin.notice = "";
  }
  emit();
}

export function setAdminError(message) {
  state.admin.loading = false;
  state.admin.error = message || "";
  if (message) state.admin.notice = "";
  emit();
}

export function setAdminNotice(message) {
  state.admin.notice = message || "";
  if (message) state.admin.error = "";
  emit();
}

export function setAdminSession(session) {
  state.admin.session = session || null;
  emit();
}

export function setAdminWeekends(weekends) {
  state.admin.weekends = Array.isArray(weekends) ? weekends : [];
  emit();
}

export function setAdminActiveWeekend(id) {
  state.admin.activeWeekendId = id || "";
  emit();
}

export function setAdminDataLoading(loading) {
  state.admin.dataLoading = Boolean(loading);
  if (loading) state.admin.dataError = "";
  emit();
}

export function setAdminDataError(message) {
  state.admin.dataLoading = false;
  state.admin.dataError = message || "";
  emit();
}

export function setAdminBundle(bundle) {
  state.admin.bundle = bundle || null;
  state.admin.dataLoading = false;
  state.admin.dataError = "";
  emit();
}

export function clearAdminData() {
  const next = initialAdmin();
  state.admin.authMode = next.authMode;
  state.admin.loading = next.loading;
  state.admin.error = next.error;
  state.admin.notice = next.notice;
  state.admin.weekends = next.weekends;
  state.admin.activeWeekendId = next.activeWeekendId;
  state.admin.bundle = next.bundle;
  state.admin.dataLoading = next.dataLoading;
  state.admin.dataError = next.dataError;
  emit();
}