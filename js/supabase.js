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
  toast("Registrierung erfolgreich. Ggf. E-Mails prüfen, falls Bestätigung nötig ist.", "success");
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

export async function saveProjectToSupabase(projectId, pageId = null) {
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

  const payload = {
    ...(pageId ? { id: pageId } : {}),
    project_id: projectId,
    name: "Startseite",
    slug: "startseite",
    content,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from("pages")
    .upsert(payload, { onConflict: "project_id,slug" })
    .select()
    .single();

  if (error) {
    toast(`Supabase Fehler: ${error.message}`, "danger");
  } else {
    toast("Projekt erfolgreich in Supabase gespeichert! ⚡", "success");
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

// Useful for the future multi-page module.
export async function getProjectPages(projectId) {
  return supabaseClient
    .from("pages")
    .select("id, project_id, name, slug, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
}

window.WebBuilderSupabase = {
  client: supabaseClient,
  getCurrentUser, signUp, signIn, signOut,
  listProjects, getProjectName, createProject,
  saveProjectToSupabase, loadProjectFromSupabase, getProjectPages
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
let activeProjectName = "";

function loginFormHtml() {
  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <p class="help-text">Melde dich an oder registriere dich, um Projekte in der Cloud zu speichern.</p>
      <div class="form-group"><label for="cloud-email">E-Mail</label><input type="email" id="cloud-email" placeholder="du@beispiel.de"></div>
      <div class="form-group"><label for="cloud-password">Passwort</label><input type="password" id="cloud-password" placeholder="••••••••"></div>
      <div style="display:flex; gap:8px;">
        <button type="button" class="btn btn-primary" id="cloud-btn-signin" style="flex:1;">Anmelden</button>
        <button type="button" class="btn btn-secondary" id="cloud-btn-signup" style="flex:1;">Registrieren</button>
      </div>
    </div>
  `;
}

function projectListHtml() {
  const rows = cachedProjects.map(p => `<button type="button" class="btn btn-secondary cloud-project-pick" data-id="${esc(p.id)}" data-name="${esc(p.name)}" style="width:100%; justify-content:flex-start; margin-bottom:6px;">${esc(p.name)}</button>`).join("");
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

function projectActiveHtml() {
  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <p class="help-text">Angemeldet als <strong>${esc(cachedUser?.email || "")}</strong>.</p>
      <p class="help-text">Aktives Projekt: <strong>${esc(activeProjectName || "Unbenannt")}</strong></p>
      <button type="button" class="btn btn-primary" id="cloud-btn-save">☁️ Jetzt in Supabase speichern</button>
      <button type="button" class="btn btn-secondary" id="cloud-btn-load">🔄 Aus Supabase neu laden</button>
      <button type="button" class="btn btn-secondary" id="cloud-btn-switch">Anderes Projekt wählen</button>
      <hr class="divider" style="margin:6px 0;">
      <button type="button" class="btn btn-danger-outline" id="cloud-btn-signout">Abmelden</button>
    </div>
  `;
}

function bindModalView() {
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
}

async function openCloudModal() {
  cachedUser = await getCurrentUser();
  const ref = loadRef();

  let body;
  if (!cachedUser) {
    body = loginFormHtml();
  } else if (ref?.projectId) {
    if (!activeProjectName) activeProjectName = await getProjectName(ref.projectId);
    body = projectActiveHtml();
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
