// WebBuilder — Supabase UI (Cloud-/Konto-Modal)
// Login/Registrierung, Projekt- und Mehrseiten-Verwaltung als Modal-UI über
// den Toolbar-Button #btn-cloud (web.html). Enthält KEINE Supabase-
// Zugriffslogik selbst — alle Daten-Operationen kommen aus
// supabase-data.js (gleicher Ordner, per ES import).
import {
  getCurrentUser, signUp, signIn, signOut, resetPassword, updatePassword,
  listProjects, getProjectName, createProject, renameProject, deleteProject,
  saveProjectToSupabase, loadProjectFromSupabase, getProjectPages,
  createPage, renamePage, deletePage, loadRef, clearRef
} from "./supabase-data.js";

// NEU: esc zentralisiert in state.js (WebBuilderUtils.escapeHtml) —
// vorher eine von 7 unabhängigen, identischen Kopien im Projekt.
const esc = window.WebBuilderUtils.escapeHtml;

let cachedUser = null;
let cachedProjects = [];
let cachedPages = [];
let activeProjectName = "";

function loginFormHtml() {
  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <p class="help-text">Melde dich an oder registriere dich, um Projekte in der Cloud zu speichern.</p>
      <div class="form-group"><label for="cloud-email">E-Mail</label><input type="email" id="cloud-email" placeholder="du@beispiel.de"></div>
      <div class="form-group"><label for="cloud-password">Passwort</label><input type="password" id="cloud-password" placeholder="••••••••"></div>
      <button type="button" id="cloud-link-forgot-password" style="align-self:flex-start; background:none; border:none; padding:0; margin-top:-4px; color:inherit; text-decoration:underline; cursor:pointer; font-size:13px; opacity:0.8;">Passwort vergessen?</button>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn btn-primary" id="cloud-btn-signin" style="flex:1;">Anmelden</button>
        <button type="button" class="btn btn-secondary" id="cloud-btn-signup" style="flex:1;">Registrieren</button>
      </div>
    </div>
  `;
}

function projectListHtml() {
  const rows = cachedProjects.map(p => `
    <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
      <button type="button" class="btn btn-secondary cloud-project-pick" data-id="${esc(p.id)}" data-name="${esc(p.name)}" style="flex:1; justify-content:flex-start;">${esc(p.name)}</button>
      <button type="button" class="btn btn-secondary cloud-project-rename" data-id="${esc(p.id)}" data-name="${esc(p.name)}" title="Umbenennen" style="padding:6px 10px;">✏️</button>
      <button type="button" class="btn btn-danger-outline cloud-project-delete" data-id="${esc(p.id)}" data-name="${esc(p.name)}" title="Löschen" style="padding:6px 10px;">🗑️</button>
    </div>
  `).join("");
  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <p class="help-text">Angemeldet als <strong>${esc(cachedUser?.email || "")}</strong>.</p>
      ${cachedProjects.length ? `<div>${rows}</div>` : '<p class="help-text">Noch keine Projekte vorhanden.</p>'}
      <hr class="divider" style="margin:6px 0;">
      <div class="form-group"><label for="cloud-new-project-name">Neues Projekt</label><input type="text" id="cloud-new-project-name" placeholder="Projektname"></div>
      <button type="button" class="btn btn-primary" id="cloud-btn-create-project">+ Projekt erstellen &amp; aktuellen Stand speichern</button>
      <hr class="divider" style="margin:6px 0;">
      <button type="button" class="btn btn-danger-outline" id="cloud-btn-signout">Abmelden</button>
    </div>
  `;
}

// Seiten-Liste innerhalb des aktiven Projekts (Mehrseiten-Verwaltung).
function pagesListHtml(activePageId) {
  const rows = cachedPages.map(p => {
    const isActive = activePageId ? p.id === activePageId : p.slug === "startseite";
    return `
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
        <button type="button" class="btn ${isActive ? "btn-primary" : "btn-secondary"} cloud-page-pick" data-id="${esc(p.id)}" style="flex:1; justify-content:flex-start;" ${isActive ? "disabled" : ""}>${isActive ? "✓ " : ""}${esc(p.name)}</button>
        <button type="button" class="btn btn-secondary cloud-page-rename" data-id="${esc(p.id)}" data-name="${esc(p.name)}" title="Seite umbenennen" style="padding:6px 10px;">✏️</button>
        ${cachedPages.length > 1 ? `<button type="button" class="btn btn-danger-outline cloud-page-delete" data-id="${esc(p.id)}" data-name="${esc(p.name)}" title="Seite löschen" style="padding:6px 10px;">🗑️</button>` : ""}
      </div>
    `;
  }).join("");
  return `
    <hr class="divider" style="margin:6px 0;">
    <div class="section-title" style="margin:0 0 6px;">Seiten</div>
    ${rows || '<p class="help-text">Noch keine Seiten vorhanden.</p>'}
    <div style="display:flex; gap:8px; margin-top:4px;">
      <input type="text" id="cloud-new-page-name" placeholder="Neue Seite">
      <button type="button" class="btn btn-secondary" id="cloud-btn-add-page">+ Seite</button>
    </div>
  `;
}

function projectActiveHtml(activePageId) {
  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <p class="help-text">Angemeldet als <strong>${esc(cachedUser?.email || "")}</strong>.</p>
      <p class="help-text">Aktives Projekt: <strong>${esc(activeProjectName || "Unbenannt")}</strong></p>
      <button type="button" class="btn btn-primary" id="cloud-btn-save">☁️ Jetzt in Supabase speichern</button>
      <button type="button" class="btn btn-secondary" id="cloud-btn-load">🔄 Aus Supabase neu laden</button>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn btn-secondary" id="cloud-btn-rename-project" style="flex:1;">✏️ Umbenennen</button>
        <button type="button" class="btn btn-danger-outline" id="cloud-btn-delete-project" style="flex:1;">🗑️ Löschen</button>
      </div>
      <button type="button" class="btn btn-secondary" id="cloud-btn-switch">Anderes Projekt wählen</button>
      ${pagesListHtml(activePageId)}
      <hr class="divider" style="margin:6px 0;">
      <button type="button" class="btn btn-danger-outline" id="cloud-btn-signout">Abmelden</button>
    </div>
  `;
}

// Eigenes kleines Formular fürs Setzen eines neuen Passworts nach Klick
// auf den Recovery-Link.
function newPasswordFormHtml() {
  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <p class="help-text">Bitte lege ein neues Passwort für dein Konto fest.</p>
      <div class="form-group"><label for="cloud-new-password">Neues Passwort</label><input type="password" id="cloud-new-password" placeholder="••••••••"></div>
      <div class="form-group"><label for="cloud-new-password-confirm">Passwort bestätigen</label><input type="password" id="cloud-new-password-confirm" placeholder="••••••••"></div>
      <button type="button" class="btn btn-primary" id="cloud-btn-set-new-password">Neues Passwort speichern</button>
    </div>
  `;
}

function openSetNewPasswordModal() {
  window.WebBuilderModals?.open?.("🔑 Neues Passwort", newPasswordFormHtml());
  document.getElementById("cloud-btn-set-new-password")?.addEventListener("click", async () => {
    const pw1 = document.getElementById("cloud-new-password")?.value || "";
    const pw2 = document.getElementById("cloud-new-password-confirm")?.value || "";
    if (!pw1 || pw1.length < 6) { window.WebBuilderToast?.show?.("Das Passwort muss mindestens 6 Zeichen lang sein.", "danger"); return; }
    if (pw1 !== pw2) { window.WebBuilderToast?.show?.("Die Passwörter stimmen nicht überein.", "danger"); return; }
    const { error } = await updatePassword(pw1);
    if (!error) await openCloudModal();
  });
}

// Reagiert auf den Passwort-Recovery-Event aus supabase-data.js (dort per
// supabaseClient.auth.onAuthStateChange ausgelöst) — unabhängig davon, ob
// das Cloud-Modal gerade offen ist.
window.addEventListener("webbuilder:supabase-password-recovery", openSetNewPasswordModal);

function bindModalView() {
  document.getElementById("cloud-link-forgot-password")?.addEventListener("click", async () => {
    const email = document.getElementById("cloud-email")?.value.trim();
    if (!email) { window.WebBuilderToast?.show?.("Bitte zuerst deine E-Mail-Adresse eingeben.", "danger"); return; }
    await resetPassword(email);
  });
  document.getElementById("cloud-btn-signin")?.addEventListener("click", async () => {
    const email = document.getElementById("cloud-email")?.value.trim();
    const password = document.getElementById("cloud-password")?.value || "";
    if (!email || !password) { window.WebBuilderToast?.show?.("Bitte E-Mail und Passwort eingeben.", "danger"); return; }
    const { error } = await signIn(email, password);
    if (!error) await openCloudModal();
  });
  document.getElementById("cloud-btn-signup")?.addEventListener("click", async () => {
    const email = document.getElementById("cloud-email")?.value.trim();
    const password = document.getElementById("cloud-password")?.value || "";
    if (!email || !password) { window.WebBuilderToast?.show?.("Bitte E-Mail und Passwort eingeben.", "danger"); return; }
    const { error } = await signUp(email, password);
    if (!error) await openCloudModal();
  });
  document.getElementById("cloud-btn-signout")?.addEventListener("click", async () => {
    await signOut();
    activeProjectName = "";
    await openCloudModal();
  });
  document.querySelectorAll(".cloud-project-pick").forEach(btn => btn.addEventListener("click", async e => {
    const id = e.currentTarget.dataset.id, name = e.currentTarget.dataset.name;
    const { error } = await loadProjectFromSupabase(id);
    if (!error) { activeProjectName = name; await openCloudModal(); }
  }));
  document.querySelectorAll(".cloud-project-rename").forEach(btn => btn.addEventListener("click", async e => {
    const id = e.currentTarget.dataset.id;
    const oldName = e.currentTarget.dataset.name;
    const newName = prompt("Neuer Projektname:", oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const { error } = await renameProject(id, newName.trim());
    if (!error) {
      if (activeProjectName === oldName) activeProjectName = newName.trim();
      await openCloudModal();
    }
  }));
  document.querySelectorAll(".cloud-project-delete").forEach(btn => btn.addEventListener("click", async e => {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    if (!confirm(`Projekt "${name}" wirklich unwiderruflich löschen? Alle zugehörigen Seiten gehen dabei ebenfalls verloren.`)) return;
    const { error } = await deleteProject(id);
    if (error) return;
    const ref = loadRef();
    if (ref?.projectId === id) { clearRef(); activeProjectName = ""; }
    await openCloudModal();
  }));
  document.getElementById("cloud-btn-create-project")?.addEventListener("click", async () => {
    const nameInput = document.getElementById("cloud-new-project-name");
    const name = nameInput?.value.trim() || "Mein Projekt";
    const { data: project, error } = await createProject(name);
    if (error || !project) return;
    const { error: saveError } = await saveProjectToSupabase(project.id, null);
    if (!saveError) { activeProjectName = project.name; await openCloudModal(); }
  });
  document.getElementById("cloud-btn-save")?.addEventListener("click", async () => {
    const ref = loadRef();
    if (!ref?.projectId) { window.WebBuilderToast?.show?.("Kein aktives Projekt.", "danger"); return; }
    await saveProjectToSupabase(ref.projectId, ref.pageId || null);
  });
  document.getElementById("cloud-btn-load")?.addEventListener("click", async () => {
    const ref = loadRef();
    if (!ref?.projectId) { window.WebBuilderToast?.show?.("Kein aktives Projekt.", "danger"); return; }
    await loadProjectFromSupabase(ref.projectId, ref.pageId || null);
  });
  document.getElementById("cloud-btn-switch")?.addEventListener("click", async () => {
    clearRef();
    activeProjectName = "";
    await openCloudModal();
  });
  document.getElementById("cloud-btn-rename-project")?.addEventListener("click", async () => {
    const ref = loadRef();
    if (!ref?.projectId) return;
    const newName = prompt("Neuer Projektname:", activeProjectName);
    if (!newName || !newName.trim() || newName.trim() === activeProjectName) return;
    const { error } = await renameProject(ref.projectId, newName.trim());
    if (!error) { activeProjectName = newName.trim(); await openCloudModal(); }
  });
  document.getElementById("cloud-btn-delete-project")?.addEventListener("click", async () => {
    const ref = loadRef();
    if (!ref?.projectId) return;
    if (!confirm(`Projekt "${activeProjectName}" wirklich unwiderruflich löschen? Alle zugehörigen Seiten gehen dabei ebenfalls verloren.`)) return;
    const { error } = await deleteProject(ref.projectId);
    if (error) return;
    clearRef();
    activeProjectName = "";
    await openCloudModal();
  });
  document.querySelectorAll(".cloud-page-pick").forEach(btn => btn.addEventListener("click", async e => {
    const ref = loadRef();
    if (!ref?.projectId) return;
    const pageId = e.currentTarget.dataset.id;
    const { error } = await loadProjectFromSupabase(ref.projectId, pageId);
    if (!error) await openCloudModal();
  }));
  document.querySelectorAll(".cloud-page-rename").forEach(btn => btn.addEventListener("click", async e => {
    const id = e.currentTarget.dataset.id;
    const oldName = e.currentTarget.dataset.name;
    const newName = prompt("Neuer Seitenname:", oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const { error } = await renamePage(id, newName.trim());
    if (!error) await openCloudModal();
  }));
  document.querySelectorAll(".cloud-page-delete").forEach(btn => btn.addEventListener("click", async e => {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    if (!confirm(`Seite "${name}" wirklich löschen?`)) return;
    const { error } = await deletePage(id);
    if (error) return;
    // Referenz zurücksetzen, wenn die gerade gelöschte Seite die aktuell
    // verknüpfte war — beim nächsten Öffnen wird dann wieder die
    // Projektliste/Startseite neu ermittelt.
    const ref = loadRef();
    if (ref?.pageId === id) clearRef();
    await openCloudModal();
  }));
  document.getElementById("cloud-btn-add-page")?.addEventListener("click", async () => {
    const ref = loadRef();
    if (!ref?.projectId) return;
    const nameInput = document.getElementById("cloud-new-page-name");
    const name = nameInput?.value.trim();
    if (!name) { window.WebBuilderToast?.show?.("Bitte einen Seitennamen eingeben.", "danger"); return; }
    const { data: page, error } = await createPage(ref.projectId, name);
    if (error || !page) return;
    window.WebBuilderToast?.show?.(`Seite "${page.name}" erstellt.`, "success");
    await openCloudModal();
  });
}

async function openCloudModal() {
  cachedUser = await getCurrentUser();
  const ref = loadRef();

  let body;
  if (!cachedUser) {
    body = loginFormHtml();
  } else if (ref?.projectId) {
    if (!activeProjectName) activeProjectName = await getProjectName(ref.projectId);
    const { data: pages } = await getProjectPages(ref.projectId);
    cachedPages = pages || [];
    body = projectActiveHtml(ref.pageId || null);
  } else {
    const { data } = await listProjects();
    cachedProjects = data;
    body = projectListHtml();
  }

  window.WebBuilderModals?.open?.("☁️ Cloud / Konto", body);
  bindModalView();
}

function bindCloudButton() {
  const btn = document.getElementById("btn-cloud");
  if (!btn || btn.dataset.webBuilderCloudBound === "true") return;
  btn.dataset.webBuilderCloudBound = "true";
  btn.addEventListener("click", e => { e.preventDefault(); openCloudModal(); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindCloudButton, { once: true });
else bindCloudButton();
