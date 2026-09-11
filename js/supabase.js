// WebBuilder — Supabase integration
// Auth (Login/Registrierung/Logout), Projekt-Verwaltung und die
// Konto-/Cloud-UI (Modal über den Toolbar-Button #btn-cloud).
//
// FIX: Diese Datei importierte vorher `{ state, renderCanvas } from
// "./builder.js"`. builder.js ist ein einfaches, nicht-modulares
// Bootstrap-Script (per document.write geladen) OHNE jede export-Anweisung
// — dieser Import konnte im Browser nie auflösen und hätte beim Ausführen
// als ES-Modul einen SyntaxError geworfen. Diese Datei lief also faktisch
// nie korrekt. Wie jedes andere Modul in diesem Projekt greift sie jetzt
// über window.WebBuilderState auf den State zu.
//
// FIX: Das bisherige Speicherformat ({ elements, headerConfig, footerConfig,
// canvasMinHeight }) passte nicht zum tatsächlichen state.js-Schema (flache
// Felder wie headerEnabled/headerItems/..., canvasHeight statt
// canvasMinHeight). Header, Footer und Hintergrund wären beim Cloud-
// Speichern nie mitgespeichert worden. Speichern/Laden nutzt jetzt
// WebBuilderStorage.createSnapshot()/applySnapshot() — dieselbe, bereits
// getestete Logik, die auch lokales Speichern/Laden und Undo/Redo
// verwenden (Projektregel 12: Wiederverwendung statt Duplikation).
//
// NEU (dieses Bündel, README-Punkt 1): Passwort-Reset, Projekte
// löschen/umbenennen, echte Mehrseiten-Verwaltung über getProjectPages()
// und ein dynamischer Bestätigungs-Hinweistext beim Registrieren. Alles
// weiterhin ohne neues Modal-Markup — dieselbe generische
// WebBuilderModals.open()-Technik wie bisher.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function toast(message, type = "info") {
  window.WebBuilderToast?.show?.(message, type);
}

// ------------------------------------------------------------------
// Lokale Referenz auf "welches Cloud-Projekt/welche Page ist aktuell
// verknüpft" — bewusst NICHT Teil von state.js/storage.js, damit Undo/Redo
// (die denselben Snapshot-Mechanismus nutzen) niemals versehentlich die
// Cloud-Projektzuordnung mit zurücksetzen.
// ------------------------------------------------------------------
const SUPABASE_REF_KEY = "webbuilder_supabase_ref";

function saveRef(ref) {
  try { localStorage.setItem(SUPABASE_REF_KEY, JSON.stringify(ref)); } catch (e) { /* ignore */ }
}
function loadRef() {
  try { const raw = localStorage.getItem(SUPABASE_REF_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function clearRef() {
  try { localStorage.removeItem(SUPABASE_REF_KEY); } catch (e) { /* ignore */ }
}

function slugify(name) {
  const slug = String(name || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `projekt-${Date.now()}`;
}

// NEU: Reagiert auf den Supabase-Recovery-Link. Klickt der Nutzer auf den
// Link aus der Passwort-Reset-Mail, leitet Supabase mit einem Recovery-
// Token zurück auf diese Seite und feuert automatisch das
// PASSWORD_RECOVERY-Event — unabhängig davon, ob das Cloud-Modal gerade
// offen ist. Wir öffnen dafür direkt das "Neues Passwort setzen"-Modal.
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") openSetNewPasswordModal();
});

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------
export async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) return null;
  return data.user || null;
}

export async function signUp(email, password) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) { toast(`Registrierung fehlgeschlagen: ${error.message}`, "danger"); return { data: null, error }; }
  // NEU: Hinweistext hängt jetzt vom tatsächlichen Supabase-Auth-Setting ab
  // statt pauschal "ggf. E-Mails prüfen" zu sagen. Ist E-Mail-Bestätigung
  // in den Supabase-Auth-Einstellungen aktiviert, liefert signUp() KEINE
  // Session zurück (Konto existiert, ist aber noch nicht bestätigt). Ist
  // sie deaktiviert, ist die Session sofort vorhanden.
  if (data.session) {
    toast("Registrierung erfolgreich – du bist jetzt angemeldet! ⚡", "success");
  } else {
    toast("Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse über den zugeschickten Link, um dich anmelden zu können.", "success");
  }
  return { data, error: null };
}

export async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) { toast(`Anmeldung fehlgeschlagen: ${error.message}`, "danger"); return { data: null, error }; }
  toast("Erfolgreich angemeldet ⚡", "success");
  return { data, error: null };
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) { toast(`Abmelden fehlgeschlagen: ${error.message}`, "danger"); return false; }
  clearRef();
  toast("Abgemeldet", "info");
  return true;
}

// NEU: Passwort-Reset per E-Mail.
export async function resetPassword(email) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) { toast(`Fehler beim Zurücksetzen des Passworts: ${error.message}`, "danger"); return { error }; }
  toast("E-Mail zum Zurücksetzen des Passworts wurde verschickt. Bitte Posteingang prüfen.", "success");
  return { error: null };
}

// NEU: Setzt nach Klick auf den Reset-Link das neue Passwort (Supabase
// erstellt dabei automatisch eine kurzlebige Recovery-Session).
export async function updatePassword(newPassword) {
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) { toast(`Fehler beim Setzen des neuen Passworts: ${error.message}`, "danger"); return { error }; }
  toast("Neues Passwort gespeichert. Du bist jetzt angemeldet ⚡", "success");
  return { error: null };
}

// ------------------------------------------------------------------
// Projects / Pages
// ------------------------------------------------------------------
export async function listProjects() {
  const user = await getCurrentUser();
  if (!user) return { data: [], error: new Error("AUTH_REQUIRED") };
  const { data, error } = await supabaseClient
    .from("projects")
    .select("id, name, slug, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) toast(`Fehler beim Laden der Projekte: ${error.message}`, "danger");
  return { data: data || [], error };
}

export async function getProjectName(projectId) {
  const { data, error } = await supabaseClient.from("projects").select("name").eq("id", projectId).single();
  if (error) return "";
  return data?.name || "";
}

// Creates the project metadata row. Builder content is saved separately in pages.
export async function createProject(name = "Mein Projekt") {
  const user = await getCurrentUser();
  if (!user) {
    toast("Bitte zuerst anmelden.", "danger");
    return { data: null, error: new Error("AUTH_REQUIRED") };
  }

  const { data, error } = await supabaseClient
    .from("projects")
    .insert({ user_id: user.id, name, slug: slugify(name) })
    .select()
    .single();

  if (error) toast(`Supabase Fehler: ${error.message}`, "danger");
  return { data, error };
}

// NEU: Projekt umbenennen.
export async function renameProject(projectId, newName) {
  const { data, error } = await supabaseClient
    .from("projects")
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()
    .single();
  if (error) { toast(`Fehler beim Umbenennen: ${error.message}`, "danger"); return { data: null, error }; }
  toast("Projekt umbenannt.", "success");
  return { data, error: null };
}

// NEU: Projekt (inkl. aller zugehörigen Seiten) löschen. Seiten werden
// bewusst zuerst explizit gelöscht, statt uns auf eine evtl. konfigurierte
// ON DELETE CASCADE-Fremdschlüsselregel zu verlassen — funktioniert so
// unabhängig vom DB-Setup, ohne das Schema anfassen zu müssen (Regel 17).
export async function deleteProject(projectId) {
  const { error: pagesError } = await supabaseClient.from("pages").delete().eq("project_id", projectId);
  if (pagesError) { toast(`Fehler beim Löschen der Seiten: ${pagesError.message}`, "danger"); return { error: pagesError }; }
  const { error } = await supabaseClient.from("projects").delete().eq("id", projectId);
  if (error) { toast(`Fehler beim Löschen: ${error.message}`, "danger"); return { error }; }
  toast("Projekt gelöscht.", "success");
  return { error: null };
}

// FIX/NEU: pageName/pageSlug sind jetzt Parameter statt fest verdrahtet auf
// "Startseite"/"startseite", damit dieselbe, bereits getestete Save-Logik
// auch fürs Anlegen weiterer Seiten wiederverwendet werden kann (Regel 12).
// Wichtig: Ist eine pageId bekannt (bestehende Seite wird aktualisiert),
// werden Name/Slug bewusst NICHT mitgeschickt — sonst hätte ein normaler
// Speichervorgang (Toolbar "Speichern") eine umbenannte Seite bei jedem
// Speichern stillschweigend wieder auf "Startseite" zurückgesetzt.
export async function saveProjectToSupabase(projectId, pageId = null, pageName = "Startseite", pageSlug = "startseite") {
  const user = await getCurrentUser();
  if (!user) {
    toast("Bitte zuerst anmelden, bevor du speicherst.", "danger");
    return { data: null, error: new Error("AUTH_REQUIRED") };
  }
  if (!projectId) {
    const error = new Error("projectId fehlt.");
    toast(error.message, "danger");
    return { data: null, error };
  }
  if (!window.WebBuilderStorage) {
    const error = new Error("WebBuilderStorage nicht verfügbar.");
    toast(error.message, "danger");
    return { data: null, error };
  }

  const content = window.WebBuilderStorage.createSnapshot();
  const updated_at = new Date().toISOString();

  let data, error;
  if (pageId) {
    ({ data, error } = await supabaseClient
      .from("pages")
      .update({ content, updated_at })
      .eq("id", pageId)
      .select()
      .single());
  } else {
    ({ data, error } = await supabaseClient
      .from("pages")
      .upsert({ project_id: projectId, name: pageName, slug: pageSlug, content, updated_at }, { onConflict: "project_id,slug" })
      .select()
      .single());
  }

  if (error) {
    toast(`Supabase Fehler: ${error.message}`, "danger");
  } else {
    toast(pageId ? "Projekt erfolgreich in Supabase gespeichert! ⚡" : `Seite "${pageName}" gespeichert! ⚡`, "success");
    saveRef({ projectId, pageId: data.id });
  }

  return { data, error };
}

export async function loadProjectFromSupabase(projectId, pageId = null) {
  const user = await getCurrentUser();
  if (!user) {
    toast("Bitte zuerst anmelden, bevor du lädst.", "danger");
    return { data: null, error: new Error("AUTH_REQUIRED") };
  }
  if (!window.WebBuilderStorage) {
    const error = new Error("WebBuilderStorage nicht verfügbar.");
    toast(error.message, "danger");
    return { data: null, error };
  }

  let query = supabaseClient
    .from("pages")
    .select("id, project_id, name, slug, content, updated_at")
    .eq("project_id", projectId);

  query = pageId ? query.eq("id", pageId) : query.eq("slug", "startseite");

  const { data, error } = await query.single();

  if (error) {
    toast(`Fehler beim Laden: ${error.message}`, "danger");
    return { data: null, error };
  }

  window.WebBuilderStorage.applySnapshot(data.content || {});
  // FIX (siehe toolbar.js Undo/Redo): das Anwenden eines Snapshots auf den
  // State allein rendert nichts neu. Wiederverwendung derselben
  // Refresh-Routine, die toolbar.js nach Undo/Redo aufruft, statt sie ein
  // drittes Mal zu implementieren.
  window.WebBuilderToolbar?.refreshAllDomains?.();
  window.WebBuilderCanvas?.refreshBackgroundEditor?.();
  saveRef({ projectId, pageId: data.id });
  toast("Projekt aus Supabase geladen! ⚡", "success");
  return { data, error: null };
}

export async function getProjectPages(projectId) {
  return supabaseClient
    .from("pages")
    .select("id, project_id, name, slug, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
}

// NEU: Weitere Seite in einem Projekt anlegen. Slug wird gegen die bereits
// geladenen Seiten geprüft, damit eine Namenskollision NICHT versehentlich
// per upsert(onConflict "project_id,slug") eine bestehende Seite
// überschreibt, sondern stattdessen einen eindeutigen Slug bekommt.
export async function createPage(projectId, name) {
  const { data: existingPages } = await getProjectPages(projectId);
  const used = new Set((existingPages || []).map(p => p.slug));
  let slug = slugify(name);
  if (used.has(slug)) slug = `${slug}-${Date.now().toString(36)}`;
  return saveProjectToSupabase(projectId, null, name, slug);
}

// NEU: Seite umbenennen (Slug bleibt bewusst unverändert, um bestehende
// Referenzen/Links auf die Seite nicht zu brechen).
export async function renamePage(pageId, newName) {
  const { data, error } = await supabaseClient
    .from("pages")
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq("id", pageId)
    .select()
    .single();
  if (error) { toast(`Fehler beim Umbenennen: ${error.message}`, "danger"); return { data: null, error }; }
  toast("Seite umbenannt.", "success");
  return { data, error: null };
}

// NEU: Seite löschen.
export async function deletePage(pageId) {
  const { error } = await supabaseClient.from("pages").delete().eq("id", pageId);
  if (error) { toast(`Fehler beim Löschen: ${error.message}`, "danger"); return { error }; }
  toast("Seite gelöscht.", "success");
  return { error: null };
}

window.WebBuilderSupabase = {
  client: supabaseClient,
  getCurrentUser, signUp, signIn, signOut, resetPassword, updatePassword,
  listProjects, getProjectName, createProject, renameProject, deleteProject,
  saveProjectToSupabase, loadProjectFromSupabase, getProjectPages,
  createPage, renamePage, deletePage
};

// ------------------------------------------------------------------
// UI: Konto-/Cloud-Modal (Login, Projekt wählen/erstellen, Speichern/Laden)
// Nutzt das bereits bestehende generische Modal (WebBuilderModals.open),
// analog zum bereits bestehenden Muster in cart.js (Produktempfehlung
// wählen) — kein neues Modal-Markup nötig.
// ------------------------------------------------------------------
const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

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

// NEU: Seiten-Liste innerhalb des aktiven Projekts (Mehrseiten-Verwaltung).
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

// NEU: Eigenes kleines Formular fürs Setzen eines neuen Passworts nach
// Klick auf den Recovery-Link.
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
    if (!pw1 || pw1.length < 6) { toast("Das Passwort muss mindestens 6 Zeichen lang sein.", "danger"); return; }
    if (pw1 !== pw2) { toast("Die Passwörter stimmen nicht überein.", "danger"); return; }
    const { error } = await updatePassword(pw1);
    if (!error) await openCloudModal();
  });
}

function bindModalView() {
  document.getElementById("cloud-link-forgot-password")?.addEventListener("click", async () => {
    const email = document.getElementById("cloud-email")?.value.trim();
    if (!email) { toast("Bitte zuerst deine E-Mail-Adresse eingeben.", "danger"); return; }
    await resetPassword(email);
  });
  document.getElementById("cloud-btn-signin")?.addEventListener("click", async () => {
    const email = document.getElementById("cloud-email")?.value.trim();
    const password = document.getElementById("cloud-password")?.value || "";
    if (!email || !password) { toast("Bitte E-Mail und Passwort eingeben.", "danger"); return; }
    const { error } = await signIn(email, password);
    if (!error) await openCloudModal();
  });
  document.getElementById("cloud-btn-signup")?.addEventListener("click", async () => {
    const email = document.getElementById("cloud-email")?.value.trim();
    const password = document.getElementById("cloud-password")?.value || "";
    if (!email || !password) { toast("Bitte E-Mail und Passwort eingeben.", "danger"); return; }
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
    if (!ref?.projectId) { toast("Kein aktives Projekt.", "danger"); return; }
    await saveProjectToSupabase(ref.projectId, ref.pageId || null);
  });
  document.getElementById("cloud-btn-load")?.addEventListener("click", async () => {
    const ref = loadRef();
    if (!ref?.projectId) { toast("Kein aktives Projekt.", "danger"); return; }
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
    const ref = loadRef();
    if (ref?.pageId === id) saveRef({ projectId: ref.projectId, pageId: null });
    await openCloudModal();
  }));
  document.getElementById("cloud-btn-add-page")?.addEventListener("click", async () => {
    const ref = loadRef();
    if (!ref?.projectId) return;
    const nameInput = document.getElementById("cloud-new-page-name");
    const name = nameInput?.value.trim();
    if (!name) { toast("Bitte einen Seitennamen eingeben.", "danger"); return; }
    const { data: page, error } = await createPage(ref.projectId, name);
    if (error || !page) return;
    saveRef({ projectId: ref.projectId, pageId: page.id });
    toast(`Seite "${page.name}" erstellt.`, "success");
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

console.log("WebBuilder: Supabase Client verbunden ⚡");
