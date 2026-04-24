import { BRAND_NAME } from "../config.js";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusBlock(message, type) {
  if (!message) return "";
  return `<div class="status status--${type}"><p>${escapeHtml(message)}</p></div>`;
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildWeekendOptions(weekends, activeId) {
  if (!weekends.length) {
    return `<option value="">Ingen helg ännu</option>`;
  }

  return weekends
    .map(
      (weekend) => `
        <option value="${escapeHtml(weekend.id)}" ${weekend.id === activeId ? "selected" : ""}>
          ${escapeHtml(weekend.title || "Namnlös helg")} · ${escapeHtml(weekend.public_code || "utan kod")}
        </option>
      `
    )
    .join("");
}

function buildPlaceOptions(places, selectedId = "") {
  const options = places
    .map(
      (place) => `
        <option value="${escapeHtml(place.id)}" ${place.id === selectedId ? "selected" : ""}>
          ${escapeHtml(place.name)}
        </option>
      `
    )
    .join("");

  return `<option value="">Ingen kopplad plats</option>${options}`;
}

function buildPlaceCards(places) {
  if (!places.length) {
    return `<div class="empty-state">Lägg in första platsen för att fylla kartan.</div>`;
  }

  return places
    .map(
      (place) => `
        <form class="item-card" data-place-edit-form data-id="${escapeHtml(place.id)}">
          <div class="field-grid two">
            <div class="field">
              <label>Namn</label>
              <input name="name" value="${escapeHtml(place.name)}" />
            </div>
            <div class="field">
              <label>Adress</label>
              <input name="address" value="${escapeHtml(place.address || "")}" />
            </div>
          </div>
          <div class="field">
            <label>Notis</label>
            <textarea name="notes">${escapeHtml(place.notes || "")}</textarea>
          </div>
          <div class="field-grid three">
            <div class="field">
              <label>Latitud</label>
              <input name="lat" value="${place.lat ?? ""}" />
            </div>
            <div class="field">
              <label>Longitud</label>
              <input name="lng" value="${place.lng ?? ""}" />
            </div>
            <div class="field">
              <label>Ordning</label>
              <input name="sort_index" type="number" value="${place.sort_index ?? 0}" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="secondary-button">Spara plats</button>
            <button type="button" class="danger-button" data-place-delete="${escapeHtml(place.id)}">Ta bort</button>
          </div>
        </form>
      `
    )
    .join("");
}

function buildActivityCards(activities, places) {
  if (!activities.length) {
    return `<div class="empty-state">Schemat är tomt. Lägg in första aktiviteten.</div>`;
  }

  return activities
    .map(
      (activity) => `
        <form class="item-card" data-activity-edit-form data-id="${escapeHtml(activity.id)}">
          <div class="field-grid two">
            <div class="field">
              <label>Titel</label>
              <input name="title" value="${escapeHtml(activity.title)}" />
            </div>
            <div class="field">
              <label>Plats</label>
              <select name="place_id">${buildPlaceOptions(places, activity.place_id || "")}</select>
            </div>
          </div>
          <div class="field">
            <label>Notis</label>
            <textarea name="notes">${escapeHtml(activity.notes || "")}</textarea>
          </div>
          <div class="field-grid three">
            <div class="field">
              <label>Start</label>
              <input type="datetime-local" name="starts_at" value="${escapeHtml(toDateInputValue(activity.starts_at))}" />
            </div>
            <div class="field">
              <label>Slut</label>
              <input type="datetime-local" name="ends_at" value="${escapeHtml(toDateInputValue(activity.ends_at))}" />
            </div>
            <div class="field">
              <label>Ordning</label>
              <input type="number" name="order_index" value="${activity.order_index ?? 0}" />
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="secondary-button">Spara aktivitet</button>
            <button type="button" class="danger-button" data-activity-delete="${escapeHtml(activity.id)}">Ta bort</button>
          </div>
        </form>
      `
    )
    .join("");
}

function buildParticipantCards(participants, liveLocations) {
  if (!participants.length) {
    return `<div class="empty-state">Ingen deltagare ännu. Lägg in gänget eller låt gäster skapa sig själva via kod.</div>`;
  }

  return participants
    .map((participant) => {
      const live = liveLocations.find((item) => item.participant_id === participant.id && item.is_active);
      const liveLabel = live ? "Har aktiv position" : "Ingen aktiv position";

      return `
        <form class="item-card" data-participant-edit-form data-id="${escapeHtml(participant.id)}">
          <div class="field-grid two">
            <div class="field">
              <label>Namn</label>
              <input name="display_name" value="${escapeHtml(participant.display_name)}" />
            </div>
            <div class="field">
              <label>Färg</label>
              <input name="color" value="${escapeHtml(participant.color || "#1c6b63")}" />
            </div>
          </div>
          <div class="chip-row">
            <span class="chip">${participant.is_guest ? "Gästskapad" : "Adminskapad"}</span>
            <span class="chip">${participant.sharing_enabled ? "Delning på" : "Delning av"}</span>
            <span class="chip">${escapeHtml(liveLabel)}</span>
          </div>
          <div class="form-actions">
            <button type="submit" class="secondary-button">Spara deltagare</button>
            <button type="button" class="danger-button" data-participant-delete="${escapeHtml(participant.id)}">Ta bort</button>
          </div>
        </form>
      `;
    })
    .join("");
}

export function renderAdminView(root, state, handlers) {
  const session = state.admin.session;
  const bundle = state.admin.bundle;
  const weekend = bundle?.weekend;
  const places = bundle?.places || [];
  const activities = bundle?.activities || [];
  const participants = bundle?.participants || [];
  const liveLocations = bundle?.liveLocations || [];

  if (!session) {
    root.innerHTML = `
      <div class="shell">
        <header class="hero hero-admin">
          <section class="hero-copy">
            <div class="topline">
              <span class="eyebrow">Adminläge</span>
              <button type="button" class="ghost-button" data-go-public>Publik vy</button>
            </div>
            <button type="button" class="brand" data-go-public>
              <span class="wordmark">${BRAND_NAME}</span>
            </button>
            <h1>Skapa helgen, håll kartan levande.</h1>
            <p>
              Logga in som arrangör för att skapa kod, lägga in stopp och följa vem som delar
              position live.
            </p>
          </section>

          <aside class="hero-panel">
            <div class="section-heading">
              <h2>${state.admin.authMode === "signup" ? "Skapa adminkonto" : "Admininloggning"}</h2>
              <p>E-post och lösenord används för din privata planering.</p>
            </div>

            <form class="stack-form" data-auth-form>
              <div class="field">
                <label for="admin-email">E-post</label>
                <input id="admin-email" type="email" name="email" placeholder="du@exempel.se" />
              </div>
              <div class="field">
                <label for="admin-password">Lösenord</label>
                <input id="admin-password" type="password" name="password" placeholder="Minst 6 tecken" />
              </div>
              <div class="form-actions">
                <button type="submit" class="primary-button" ${state.admin.loading ? "disabled" : ""}>
                  ${state.admin.loading ? "Jobbar…" : state.admin.authMode === "signup" ? "Skapa konto" : "Logga in"}
                </button>
                <button type="button" class="ghost-button" data-toggle-auth>
                  ${state.admin.authMode === "signup" ? "Har redan konto" : "Skapa nytt konto"}
                </button>
              </div>
            </form>

            ${statusBlock(state.admin.error, "error")}
            ${statusBlock(state.admin.notice, "success")}
          </aside>
        </header>
      </div>
    `;

    root.querySelectorAll("[data-go-public]").forEach((button) => {
      button.addEventListener("click", handlers.goPublic);
    });
    root.querySelector("[data-toggle-auth]")?.addEventListener("click", handlers.toggleAuthMode);
    root.querySelector("[data-auth-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      handlers.submitAuth({
        email: formData.get("email"),
        password: formData.get("password"),
        mode: state.admin.authMode,
      });
    });

    return { mapElement: null };
  }

  root.innerHTML = `
    <div class="shell">
      <header class="hero hero-admin">
        <section class="hero-copy">
          <div class="topline">
            <span class="eyebrow">Arrangörspanel</span>
            <div class="toolbar">
              <button type="button" class="ghost-button" data-go-public>Publik vy</button>
              <button type="button" class="ghost-button" data-logout>Logga ut</button>
            </div>
          </div>
          <button type="button" class="brand" data-go-public>
            <span class="wordmark">${BRAND_NAME}</span>
          </button>
          <h1>Bygg helgen runt en kod.</h1>
          <p>Välj aktiv helg, fyll på stopp och se livepositioner på samma karta som deltagarna ser.</p>
          <div class="chip-row">
            <span class="chip">${escapeHtml(session.user.email || "Inloggad")}</span>
            <span class="chip">${state.admin.weekends.length} helger</span>
            <span class="chip">${liveLocations.filter((item) => item.is_active).length} aktiva positioner</span>
          </div>
        </section>

        <aside class="hero-panel admin-topbar">
          <div class="field">
            <label for="weekend-select">Aktiv helg</label>
            <select id="weekend-select" data-weekend-select>
              ${buildWeekendOptions(state.admin.weekends, state.admin.activeWeekendId)}
            </select>
          </div>

          <form class="stack-form" data-create-weekend-form>
            <div class="field-grid two">
                    <div class="field">
                      <label>Titel</label>
                      <input name="title" placeholder="Mikaels svensexa" required />
                    </div>
              <div class="field">
                <label>Ort</label>
                <input name="city" placeholder="Stockholm" />
              </div>
            </div>
            <div class="field-grid two">
              <div class="field">
                <label>Start</label>
                <input type="datetime-local" name="start_at" />
              </div>
              <div class="field">
                <label>Kod</label>
                <input name="public_code" placeholder="Auto om tomt" />
              </div>
            </div>
            <button type="submit" class="primary-button" ${state.admin.dataLoading ? "disabled" : ""}>
              ${state.admin.dataLoading ? "Skapar…" : "Skapa ny helg"}
            </button>
          </form>

          ${statusBlock(state.admin.error, "error")}
          ${statusBlock(state.admin.notice, "success")}
          ${statusBlock(state.admin.dataError, "error")}
        </aside>
      </header>

      ${
        weekend
          ? `
            <main class="admin-grid">
              <section class="panel panel--full">
                <div class="section-heading">
                  <h2>Helginställningar</h2>
                  <p>Spara namn, kod, tider och publik introduktion.</p>
                </div>
                <form class="stack-form" data-weekend-settings-form data-id="${escapeHtml(weekend.id)}">
                  <div class="field-grid two">
                    <div class="field">
                      <label>Titel</label>
                      <input name="title" value="${escapeHtml(weekend.title || "")}" />
                    </div>
                    <div class="field">
                      <label>Underrubrik</label>
                      <input name="subtitle" value="${escapeHtml(weekend.subtitle || "")}" />
                    </div>
                  </div>
                  <div class="field-grid three">
                    <div class="field">
                      <label>Ort</label>
                      <input name="city" value="${escapeHtml(weekend.city || "")}" />
                    </div>
                    <div class="field">
                      <label>Kod</label>
                      <input name="public_code" value="${escapeHtml(weekend.public_code || "")}" />
                    </div>
                    <div class="field">
                      <label>Publicerad</label>
                      <label class="checkbox-row">
                        <input type="checkbox" name="is_published" ${weekend.is_published ? "checked" : ""} />
                        Tillgänglig för deltagare
                      </label>
                    </div>
                  </div>
                  <div class="field-grid two">
                    <div class="field">
                      <label>Start</label>
                      <input type="datetime-local" name="start_at" value="${escapeHtml(toDateInputValue(weekend.start_at))}" />
                    </div>
                    <div class="field">
                      <label>Slut</label>
                      <input type="datetime-local" name="end_at" value="${escapeHtml(toDateInputValue(weekend.end_at))}" />
                    </div>
                  </div>
                  <div class="field">
                    <label>Introduktion</label>
                    <textarea name="intro">${escapeHtml(weekend.intro || "")}</textarea>
                  </div>
                  <div class="field">
                    <label>Meddelande om platsdelning</label>
                    <textarea name="sharing_message">${escapeHtml(weekend.sharing_message || "")}</textarea>
                  </div>
                  <button type="submit" class="primary-button">${state.admin.dataLoading ? "Sparar…" : "Spara helg"}</button>
                </form>
              </section>

              <section class="panel">
                <div class="section-heading">
                  <h2>Platser</h2>
                  <p>Lägg upp stopp som både schema och karta använder.</p>
                </div>
                <form class="stack-form" data-place-create-form>
                  <div class="field-grid two">
                    <div class="field">
                      <label>Namn</label>
                      <input name="name" placeholder="Fördrink" />
                    </div>
                    <div class="field">
                      <label>Adress</label>
                      <input name="address" placeholder="Gata 1" />
                    </div>
                  </div>
                  <div class="field">
                    <label>Notis</label>
                    <textarea name="notes"></textarea>
                  </div>
                  <div class="field-grid three">
                    <div class="field">
                      <label>Latitud</label>
                      <input name="lat" placeholder="59.33" />
                    </div>
                    <div class="field">
                      <label>Longitud</label>
                      <input name="lng" placeholder="18.06" />
                    </div>
                    <div class="field">
                      <label>Ordning</label>
                      <input type="number" name="sort_index" value="0" />
                    </div>
                  </div>
                  <button type="submit" class="primary-button">Lägg till plats</button>
                </form>
                <div class="list-stack">${buildPlaceCards(places)}</div>
              </section>

              <section class="panel">
                <div class="section-heading">
                  <h2>Aktiviteter</h2>
                  <p>Bygg tidslinjen som deltagarna ser direkt efter kodinmatning.</p>
                </div>
                <form class="stack-form" data-activity-create-form>
                  <div class="field-grid two">
                    <div class="field">
                      <label>Titel</label>
                      <input name="title" placeholder="Lunch och briefing" />
                    </div>
                    <div class="field">
                      <label>Plats</label>
                      <select name="place_id">${buildPlaceOptions(places)}</select>
                    </div>
                  </div>
                  <div class="field">
                    <label>Notis</label>
                    <textarea name="notes"></textarea>
                  </div>
                  <div class="field-grid three">
                    <div class="field">
                      <label>Start</label>
                      <input type="datetime-local" name="starts_at" />
                    </div>
                    <div class="field">
                      <label>Slut</label>
                      <input type="datetime-local" name="ends_at" />
                    </div>
                    <div class="field">
                      <label>Ordning</label>
                      <input type="number" name="order_index" value="0" />
                    </div>
                  </div>
                  <button type="submit" class="primary-button">Lägg till aktivitet</button>
                </form>
                <div class="list-stack">${buildActivityCards(activities, places)}</div>
              </section>

              <section class="panel">
                <div class="section-heading">
                  <h2>Deltagare</h2>
                  <p>Förbered listan eller låt gäster skapa sina namn när de ansluter.</p>
                </div>
                <form class="stack-form" data-participant-create-form>
                  <div class="field-grid two">
                    <div class="field">
                      <label>Namn</label>
                      <input name="display_name" placeholder="Johan" />
                    </div>
                    <div class="field">
                      <label>Färg</label>
                      <input name="color" value="#1c6b63" />
                    </div>
                  </div>
                  <button type="submit" class="primary-button">Lägg till deltagare</button>
                </form>
                <div class="list-stack">${buildParticipantCards(participants, liveLocations)}</div>
              </section>

              <section class="panel">
                <div class="section-heading">
                  <h2>Livekarta</h2>
                  <p>Aktiva positioner och planerade stopp i samma vy.</p>
                </div>
                <div class="map-shell">
                  <div class="map-canvas" data-admin-map></div>
                  <p class="map-caption">Kartan visar bara senast sparade positioner för aktiv helg.</p>
                </div>
              </section>
            </main>
          `
          : `
            <section class="panel">
              <div class="section-heading">
                <h2>Ingen aktiv helg ännu</h2>
                <p>Skapa din första helg i panelen ovan för att låsa upp schema, platser och deltagare.</p>
              </div>
            </section>
          `
      }
    </div>
  `;

  root.querySelectorAll("[data-go-public]").forEach((button) => {
    button.addEventListener("click", handlers.goPublic);
  });
  root.querySelector("[data-logout]")?.addEventListener("click", handlers.logout);

  root.querySelector("[data-weekend-select]")?.addEventListener("change", (event) => {
    handlers.selectWeekend(event.currentTarget.value);
  });

  root.querySelector("[data-create-weekend-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.createWeekend(new FormData(event.currentTarget));
  });

  root.querySelector("[data-weekend-settings-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.updateWeekend({
      id: event.currentTarget.dataset.id,
      formData: new FormData(event.currentTarget),
    });
  });

  root.querySelector("[data-place-create-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.createPlace(new FormData(event.currentTarget));
  });

  root.querySelectorAll("[data-place-edit-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handlers.updatePlace({
        id: event.currentTarget.dataset.id,
        formData: new FormData(event.currentTarget),
      });
    });
  });

  root.querySelectorAll("[data-place-delete]").forEach((button) => {
    button.addEventListener("click", () => handlers.deletePlace(button.dataset.placeDelete));
  });

  root.querySelector("[data-activity-create-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.createActivity(new FormData(event.currentTarget));
  });

  root.querySelectorAll("[data-activity-edit-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handlers.updateActivity({
        id: event.currentTarget.dataset.id,
        formData: new FormData(event.currentTarget),
      });
    });
  });

  root.querySelectorAll("[data-activity-delete]").forEach((button) => {
    button.addEventListener("click", () => handlers.deleteActivity(button.dataset.activityDelete));
  });

  root.querySelector("[data-participant-create-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.createParticipant(new FormData(event.currentTarget));
  });

  root.querySelectorAll("[data-participant-edit-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handlers.updateParticipant({
        id: event.currentTarget.dataset.id,
        formData: new FormData(event.currentTarget),
      });
    });
  });

  root.querySelectorAll("[data-participant-delete]").forEach((button) => {
    button.addEventListener("click", () =>
      handlers.deleteParticipant(button.dataset.participantDelete)
    );
  });

  return {
    mapElement: root.querySelector("[data-admin-map]"),
  };
}
