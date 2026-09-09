// WebBuilder — Supabase integration
// Adapted to the CURRENT Supabase schema: projects + pages.
// The builder state is stored in pages.content (JSONB), not projects.data.
// Only the publishable key is used in the browser.

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase-config.js";
import { state, renderCanvas } from "./builder.js";

export const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return console[type === "danger" ? "error" : "log"](message);

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === "success" ? "✅" : type === "danger" ? "⚠️" : "ℹ️"}</span> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export async function getCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) return null;
  return data.user || null;
}

// Creates the project metadata row. Builder content is saved separately in pages.
export async function createProject(name = "Mein Projekt", slug = "mein-projekt") {
  const user = await getCurrentUser();
  if (!user) {
    showToast("Bitte zuerst anmelden.", "danger");
    return { data: null, error: new Error("AUTH_REQUIRED") };
  }

  const { data, error } = await supabaseClient
    .from("projects")
    .insert({ user_id: user.id, name, slug })
    .select()
    .single();

  if (error) showToast(`Supabase Fehler: ${error.message}`, "danger");
  return { data, error };
}

export async function saveProjectToSupabase(projectId, pageId = null) {
  const user = await getCurrentUser();
  if (!user) {
    showToast("Bitte zuerst anmelden, bevor du speicherst.", "danger");
    return { data: null, error: new Error("AUTH_REQUIRED") };
  }

  if (!projectId) {
    const error = new Error("projectId fehlt.");
    showToast(error.message, "danger");
    return { data: null, error };
  }

  const content = {
    elements: state.elements,
    headerConfig: state.headerConfig,
    footerConfig: state.footerConfig,
    canvasMinHeight: state.canvasMinHeight
  };

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
    showToast(`Supabase Fehler: ${error.message}`, "danger");
  } else {
    showToast("Projekt erfolgreich in Supabase gespeichert! ⚡", "success");
  }

  return { data, error };
}

export async function loadProjectFromSupabase(projectId, pageId = null) {
  const user = await getCurrentUser();
  if (!user) {
    showToast("Bitte zuerst anmelden, bevor du lädst.", "danger");
    return { data: null, error: new Error("AUTH_REQUIRED") };
  }

  let query = supabaseClient
    .from("pages")
    .select("id, project_id, name, slug, content, updated_at")
    .eq("project_id", projectId);

  query = pageId ? query.eq("id", pageId) : query.eq("slug", "startseite");

  const { data, error } = await query.single();

  if (error) {
    showToast(`Fehler beim Laden: ${error.message}`, "danger");
    return { data: null, error };
  }

  const content = data.content || {};
  state.elements = content.elements || [];
  state.headerConfig = content.headerConfig || state.headerConfig;
  state.footerConfig = content.footerConfig || state.footerConfig;
  state.canvasMinHeight = content.canvasMinHeight ?? 800;
  state.selectedElementId = null;

  renderCanvas();
  showToast("Projekt aus Supabase geladen! ⚡", "success");
  return { data, error: null };
}

// Useful for the future autosave/storage module.
export async function getProjectPages(projectId) {
  return supabaseClient
    .from("pages")
    .select("id, project_id, name, slug, updated_at")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
}

window.WebBuilderSupabase = {
  client: supabaseClient,
  getCurrentUser,
  createProject,
  saveProjectToSupabase,
  loadProjectFromSupabase,
  getProjectPages
};

console.log("WebBuilder: Supabase Client verbunden ⚡");
