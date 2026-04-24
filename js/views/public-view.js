import { BRAND_NAME } from "../config.js";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTime(value) {
  if (!value) return "Tid kommer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tid kommer";
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelative(value) {
  if (!value) return "inte nyligen uppdaterad";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "inte nyligen uppdaterad";
  return new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildActivities(activities = []) {
  if (!activities.length) {
    return `<div class="empty-state">Schemat är tomt just nu.</div>`;
  }

  return activities
    .map(
      (activity) => `
        <article class="timeline-item">
          <span class="timeline-time">${escapeHtml(formatDateTime(activity.starts_at))}</span>
          <strong>${escapeHtml(activity.title)}</strong>
          <span>${escapeHtml(activity.place_name || "Plats meddelas senare")}</span>
          <p>${escapeHtml(activity.notes || "Ingen extra notering ännu.")}</p>
        </article>
      `
    )
    .join("");
}

function buildPlaces(places = []) {
  if (!places.length) {
    return `<div class="empty-state">Inga platser är upplagda ännu.</div>`;
  }

  return places
    .map(
      (place) => `
        <article class="item-card">
          <div class="split-row">
            <div>
              <h3>${escapeHtml(place.name)}</h3>
              <p>${escapeHtml(place.address || "Adress kommer senare")}</p>
            </div>
            <span class="chip">${place.lat && place.lng ? "Karta klar" : "Utan koordinat"}</span>
          </div>
          <p>${escapeHtml(place.notes || "Ingen extra platsinfo.")}</p>
        </article>
      `
    )
    .join("");
}

function buildParticipants(participants = []) {
  if (!participants.length) {
    return `<div class="empty-state">Ingen deltagarlista ännu.</div>`;
  }

  return participants
    .map((participant) => {
      const location = participant.location;
      const statusText =
        participant.sharing_enabled && location
          ? `Delar plats · ${escapeHtml(formatRelative(location.recorded_at))}`
          : "Delar inte plats just nu";

      return `
        <article class="participant-item">
          <div class="participant-meta">
            <span class="swatch" style="background:${escapeHtml(participant.color || "#1c6b63")}"></span>
            <strong>${escapeHtml(participant.display_name)}</strong>
            ${participant.is_guest ? `<span class="chip">gäst</span>` : ""}
          </div>
          <span>${statusText}</span>
        </article>
      `;
    })
    .join("");
}

function statusBlock(message, type) {
  if (!message) return "";
  return `<div class="status status--${type}"><p>${escapeHtml(message)}</p></div>`;
}

export function renderPublicView(root, state, handlers) {
  const bundle = state.public.weekend;
  const weekend = bundle?.weekend;
  const activities = bundle?.activities || [];
  const places = bundle?.places || [];
  const participants = bundle?.participants || [];

  const sharingLabel =
    state.public.sharingStatus === "sharing" ? "Delning pågår" : "Starta delning";

  root.innerHTML = `
    <div class="shell">
      <header class="hero hero-public">
        <section class="hero-copy">
          <div class="topline">
            <span class="eyebrow">Helgplanering med kod</span>
            <button type="button" class="ghost-button" data-go-admin>Admin</button>
          </div>
          <button type="button" class="brand" data-home>
            <span class="wordmark">${BRAND_NAME}</span>
          </button>
          <h1>En gemensam karta för hela svensexan.</h1>
          <p>
            Ladda dagens schema, se nästa stopp och dela din position bara när du själv vill.
          </p>
          <div class="kpi-row">
            <div class="kpi">
              <span class="muted">Kod</span>
              <strong>${escapeHtml(weekend?.public_code || "—")}</strong>
            </div>
            <div class="kpi">
              <span class="muted">Aktiviteter</span>
              <strong>${activities.length}</strong>
            </div>
            <div class="kpi">
              <span class="muted">Platser</span>
              <strong>${places.length}</strong>
            </div>
          </div>
        </section>

        <aside class="hero-panel">
          <div class="section-heading">
            <h2>Gå med via kod</h2>
            <p>Din kod öppnar schema, deltagarlista och livekarta.</p>
          </div>

          <form class="stack-form" data-code-form>
            <div class="field-grid two">
              <div class="field">
                <label for="public-code">Kod</label>
                <input id="public-code" name="code" placeholder="ABC123" value="${escapeHtml(state.public.code)}" />
              </div>
              <div class="field">
                <label for="public-name">Ditt namn</label>
                <input id="public-name" name="name" placeholder="Exempel: Johan" value="${escapeHtml(state.public.name)}" />
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="primary-button" ${state.public.loading ? "disabled" : ""}>
                ${state.public.loading ? "Laddar…" : "Ladda helgen"}
              </button>
              <button type="button" class="secondary-button" data-refresh ${!state.public.code ? "disabled" : ""}>
                Uppdatera vy
              </button>
            </div>
          </form>

          ${statusBlock(state.public.error, "error")}
          ${statusBlock(state.public.notice, "success")}

          <div class="status-stack">
            <div class="status status--muted">
              <p>${escapeHtml(weekend?.title || "Ingen helg laddad ännu.")}</p>
            </div>
            <div class="status ${state.public.shareError ? "status--error" : "status--success"}">
              <p>
                ${
                  state.public.shareError
                    ? escapeHtml(state.public.shareError)
                    : escapeHtml(
                        state.public.lastRecordedAt
                          ? `Senaste position skickad ${formatRelative(state.public.lastRecordedAt)}`
                          : "Platsdelning är avstängd tills du startar den."
                      )
                }
              </p>
            </div>
            <div class="inline-actions">
              <button type="button" class="primary-button" data-start-share ${!state.public.code ? "disabled" : ""}>
                ${sharingLabel}
              </button>
              <button type="button" class="ghost-button" data-stop-share ${!state.public.joinToken ? "disabled" : ""}>
                Stoppa delning
              </button>
            </div>
          </div>
        </aside>
      </header>

      <main class="content-grid">
        <section class="panel">
          <div class="section-heading">
            <h2>Livekarta</h2>
            <p>Platser och deltagare som delar position just nu.</p>
          </div>
          <div class="map-shell">
            <div class="map-canvas" data-public-map></div>
            <p class="map-caption">
              ${weekend ? "Kartan uppdateras när någon delar sin position." : "Ladda en kod för att visa kartan."}
            </p>
          </div>
        </section>

        <section class="panel">
          <div class="section-heading">
            <h2>Helgöversikt</h2>
            <p>${escapeHtml(weekend?.intro || "Ingen introduktion än.")}</p>
          </div>
          <div class="chip-row">
            <span class="chip code-pill">${escapeHtml(weekend?.public_code || "INGEN KOD")}</span>
            <span class="chip">${escapeHtml(weekend?.city || "Ort kommer")}</span>
            <span class="chip">${weekend?.is_published ? "Publicerad" : "Förhandsläge"}</span>
          </div>
          <div class="status status--muted">
            <p>${escapeHtml(weekend?.sharing_message || "Be alla starta delning bara när det hjälper gruppen.")}</p>
          </div>
        </section>

        <section class="panel">
          <div class="section-heading">
            <h2>Schema</h2>
            <p>Nästa stopp först. Perfekt när gruppen sprider ut sig.</p>
          </div>
          <div class="timeline">${buildActivities(activities)}</div>
        </section>

        <section class="panel">
          <div class="section-heading">
            <h2>Platser</h2>
            <p>Alla stopp samlade med adress och kort notis.</p>
          </div>
          <div class="list-stack">${buildPlaces(places)}</div>
        </section>

        <section class="panel panel--full">
          <div class="section-heading">
            <h2>Deltagare</h2>
            <p>Se vilka som redan är inne och vilka som delar position.</p>
          </div>
          <div class="participant-list">${buildParticipants(participants)}</div>
        </section>
      </main>
    </div>
  `;

  root.querySelector("[data-go-admin]")?.addEventListener("click", handlers.goAdmin);
  root.querySelector("[data-home]")?.addEventListener("click", handlers.goPublic);

  root.querySelector("[data-code-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    handlers.loadWeekend({
      code: formData.get("code"),
      name: formData.get("name"),
    });
  });

  root.querySelector("[data-refresh]")?.addEventListener("click", () => {
    const form = root.querySelector("[data-code-form]");
    const formData = new FormData(form);
    handlers.refreshWeekend({
      code: formData.get("code"),
      name: formData.get("name"),
    });
  });

  root.querySelector("[data-start-share]")?.addEventListener("click", () => {
    const form = root.querySelector("[data-code-form]");
    const formData = new FormData(form);
    handlers.startSharing({
      code: formData.get("code"),
      name: formData.get("name"),
    });
  });

  root.querySelector("[data-stop-share]")?.addEventListener("click", handlers.stopSharing);

  return {
    mapElement: root.querySelector("[data-public-map]"),
  };
}
