// WebBuilder — Supabase integration
// Uses the existing frontend-safe publishable key from ../supabase-config.js.
// NEVER put a Supabase secret/service_role key in frontend code.

(() => {
  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0";
  let supabaseClient = null;
  let sdkPromise = null;

  function toast(message, type = "info") {
    if (typeof window.showToast === "function") {
      window.showToast(message, type);
      return;
    }
    window.dispatchEvent(new CustomEvent("webbuilder:toast", { detail: { message, type } }));
    console[type === "danger" ? "error" : "log"](message);
  }

  function loadSdk() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-webbuilder-supabase-sdk="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.supabase));
        existing.addEventListener("error", () => reject(new Error("Supabase SDK konnte nicht geladen werden.")));
        return;
      }

      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.dataset.webbuilderSupabaseSdk = "true";
      script.onload = () => window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error("Supabase SDK geladen, aber createClient fehlt."));
      script.onerror = () => reject(new Error("Supabase SDK konnte nicht geladen werden."));
      document.head.appendChild(script);
    });

    return sdkPromise;
  }

  async function initSupabase() {
    if (supabaseClient) return supabaseClient;

    if (!window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Supabase URL/Publishable Key fehlt.");
    }

    const sdk = await loadSdk();
    supabaseClient = sdk.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
    window.WebBuilderSupabase = window.WebBuilderSupabase || {};
    window.WebBuilderSupabase.client = supabaseClient;
    return supabaseClient;
  }

  async function getClient() {
    return initSupabase();
  }

  async function getCurrentUser() {
    const client = await getClient();
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  // Saves builder state into pages.content because public.projects has no `data` column.
  // The project itself stores metadata; the page stores the actual builder JSON.
  async function saveProjectToSupabase(projectId, state, pageId = null) {
    try {
      const client = await getClient();
      const user = await getCurrentUser();

      if (!user) {
        toast("Bitte zuerst anmelden, bevor du ein Projekt speicherst.", "danger");
        return { data: null, error: new Error("AUTH_REQUIRED") };
      }

      if (!projectId) {
        throw new Error("projectId fehlt.");
      }

      const payload = {
        elements: state?.elements || [],
        headerConfig: state?.headerConfig || {},
        footerConfig: state?.footerConfig || {},
        canvasMinHeight: state?.canvasMinHeight ?? 800
      };

      let query = client
        .from("pages")
        .upsert({
          ...(pageId ? { id: pageId } : {}),
          project_id: projectId,
          name: state?.pageName || "Startseite",
          slug: state?.pageSlug || "startseite",
          content: payload,
          updated_at: new Date().toISOString()
        }, { onConflict: "project_id,slug" })
        .select()
        .single();

      const { data, error } = await query;
      if (error) throw error;

      toast("Projekt erfolgreich in Supabase gespeichert! ⚡", "success");
      return { data, error: null };
    } catch (error) {
      toast(`Supabase Fehler: ${error.message}`, "danger");
      return { data: null, error };
    }
  }

  async function loadProjectFromSupabase(projectId, pageId = null, pageSlug = "startseite") {
    try {
      const client = await getClient();
      const user = await getCurrentUser();

      if (!user) {
        toast("Bitte zuerst anmelden, bevor du ein Projekt lädst.", "danger");
        return { data: null, error: new Error("AUTH_REQUIRED") };
      }

      let request = client
        .from("pages")
        .select("id, project_id, name, slug, content, updated_at")
        .eq("project_id", projectId);

      request = pageId ? request.eq("id", pageId) : request.eq("slug", pageSlug);

      const { data, error } = await request.single();
      if (error) throw error;

      const content = data?.content || {};
      const state = {
        elements: content.elements || [],
        headerConfig: content.headerConfig || {},
        footerConfig: content.footerConfig || {},
        canvasMinHeight: content.canvasMinHeight ?? 800,
        pageName: data.name,
        pageSlug: data.slug,
        pageId: data.id
      };

      // Future modular builder can consume this directly.
      window.WebBuilderSupabase.lastLoadedState = state;
      window.dispatchEvent(new CustomEvent("webbuilder:project-loaded", { detail: state }));

      if (typeof window.renderCanvas === "function") window.renderCanvas();
      toast("Projekt aus Supabase geladen! ⚡", "success");
      return { data: state, error: null };
    } catch (error) {
      toast(`Fehler beim Laden: ${error.message}`, "danger");
      return { data: null, error };
    }
  }

  async function createProject(name, slug) {
    const client = await getClient();
    const user = await getCurrentUser();
    if (!user) throw new Error("AUTH_REQUIRED");

    const { data, error } = await client
      .from("projects")
      .insert({ user_id: user.id, name, slug })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  window.WebBuilderSupabase = window.WebBuilderSupabase || {};
  Object.assign(window.WebBuilderSupabase, {
    initSupabase,
    getClient,
    getCurrentUser,
    createProject,
    saveProjectToSupabase,
    loadProjectFromSupabase
  });

  // Load the SDK/client automatically without changing the existing builder UI.
  initSupabase()
    .then(() => console.log("WebBuilder: Supabase verbunden ⚡"))
    .catch(error => console.warn("WebBuilder: Supabase noch nicht verbunden.", error.message));
})();
