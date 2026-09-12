// WebBuilder — Supabase Datenschicht
// Client-Initialisierung, Auth (Login/Registrierung/Passwort-Reset/Logout)
// und Projekt-/Seiten-CRUD. Enthält KEINE UI — das Cloud-/Konto-Modal lebt
// in js/supabase-ui.js.
//
// Modul-Datei (type="module"), da @supabase/supabase-js sowie
// supabase-config.js per ES import geladen werden. js/supabase-ui.js
// importiert die hier benötigten Funktionen direkt per ES import statt
// über window.WebBuilderXxx (Projektkonvention für alle sonstigen Module,
// siehe js/README.md) — Grund: type="module"-Skripte werden vom Browser
// deferred ausgeführt; ein regulärer <script>-Tag zwischen zwei
// Modul-Tags würde daher VOR dem Modul laufen. Ein ES-Import garantiert
// die richtige Ladereihenfolge unabhängig von der document.write()-
// Reihenfolge in builder.js. window.WebBuilderSupabase bleibt trotzdem als
// öffentliche API bestehen (z. B. für Konsole/Debugging oder künftige
// Module).
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
// Cloud-Projektzuordnung mit zurücksetzen. saveRef() bleibt privat (wird
// nur intern nach save/load aufgerufen), loadRef()/clearRef() werden auch
// von supabase-ui.js benötigt und daher exportiert.
// ------------------------------------------------------------------
const SUPABASE_REF_KEY = "webbuilder_supabase_ref";

function saveRef(ref) {
  try { localStorage.setItem(SUPABASE_REF_KEY, JSON.stringify(ref)); } catch (e) { /* ignore */ }
}
export function loadRef() {
  try { const raw = localStorage.getItem(SUPABASE_REF_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
export function clearRef() {
  try { localStorage.removeItem(SUPABASE_REF_KEY); } catch (e) { /* ignore */ }
}

function slugify(name) {
  const slug = String(name || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || `projekt-${Date.now()}`;
}

// Reagiert auf den Supabase-Recovery-Link (Passwort-Reset). Die Datenschicht
// kennt keine UI — sie meldet das Ereignis per CustomEvent; supabase-ui.js
// hört darauf und öffnet das passende Modal (gleiches Muster wie
// webbuilder:state-change in state.js).
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    window.dispatchEvent(new CustomEvent("webbuilder:supabase-password-recovery"));
  }
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
  // Hinweistext hängt vom tatsächlichen Supabase-Auth-Setting ab: ist
  // E-Mail-Bestätigung aktiviert, liefert signUp() keine Session zurück.
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

// Passwort-Reset per E-Mail.
export async function resetPassword(email) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });
  if (error) { toast(`Fehler beim Zurücksetzen des Passworts: ${error.message}`, "danger"); return { error }; }
  toast("E-Mail zum Zurücksetzen des Passworts wurde verschickt. Bitte Posteingang prüfen.", "success");
  return { error: null };
}

// Setzt nach Klick auf den Reset-Link das neue Passwort (Supabase erstellt
// dabei automatisch eine kurzlebige Recovery-Session).
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

// Projekt umbenennen.
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

// Projekt (inkl. aller zugehörigen Seiten) löschen. Seiten werden bewusst
// zuerst explizit gelöscht, statt uns auf eine evtl. konfigurierte
// ON DELETE CASCADE-Fremdschlüsselregel zu verlassen.
export async function deleteProject(projectId) {
  const { error: pagesError } = await supabaseClient.from("pages").delete().eq("project_id", projectId);
  if (pagesError) { toast(`Fehler beim Löschen der Seiten: ${pagesError.message}`, "danger"); return { error: pagesError }; }
  const { error } = await supabaseClient.from("projects").delete().eq("id", projectId);
  if (error) { toast(`Fehler beim Löschen: ${error.message}`, "danger"); return { error }; }
  toast("Projekt gelöscht.", "success");
  return { error: null };
}

// pageName/pageSlug sind Parameter, damit dieselbe Save-Logik auch fürs
// Anlegen weiterer Seiten wiederverwendet werden kann. Ist eine pageId
// bekannt (bestehende Seite wird aktualisiert), werden Name/Slug bewusst
// NICHT mitgeschickt — sonst würde ein normaler Speichervorgang eine
// umbenannte Seite bei jedem Speichern stillschweigend zurücksetzen.
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
  // Wiederverwendung derselben Refresh-Routine, die toolbar.js nach
  // Undo/Redo aufruft (Regel 12).
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

// Weitere Seite in einem Projekt anlegen. Slug wird gegen die bereits
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

// Seite umbenennen (Slug bleibt bewusst unverändert, um bestehende
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

// Seite löschen.
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
  createPage, renamePage, deletePage,
  loadRef, clearRef
};

console.log("WebBuilder: Supabase Client verbunden ⚡");
