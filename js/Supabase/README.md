# Supabase integration

All Supabase-related files live together in this folder.

| File | Responsible for |
|---|---|
| `supabase-config.js` | Just the two constants `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. **Never** a secret/service-role key (see comment in the file + root `README.md` "Security"). |
| `supabase-data.js` | Data layer: client creation, auth (login/signup/password reset/logout), project and page CRUD against the `projects`/`pages` tables. No DOM/UI logic. Exposes `window.WebBuilderSupabase` plus ES exports. |
| `supabase-ui.js` | UI layer: the whole cloud/account modal (`#btn-cloud` in `web.html`) — login form, project list, page management, password-reset dialog. Imports what it needs directly from `supabase-data.js` via ES `import`. |

## Why ES `import` instead of `window.WebBuilderXxx`?

Everywhere else in the project, modules talk to each other via
`window.WebBuilderXxx` (see `js/README.md`). Here it's different because
all three files are `type="module"` — module scripts are deferred by the
browser (run after parsing), so a plain `<script>` tag between two module
tags would run *before* the module, and even two module tags don't
necessarily run in document order relative to `window` state. An
`import` guarantees `supabase-data.js` is fully evaluated before
`supabase-ui.js` reads from it. `window.WebBuilderSupabase` still exists
as a public API (console, debugging, future modules).

## External dependencies

- `supabase-data.js` uses `window.WebBuilderStorage` (create/apply a
  snapshot), `window.WebBuilderToolbar` (refresh after a cloud load),
  `window.WebBuilderCanvas` (background editor refresh) and
  `window.WebBuilderToast`.
- `supabase-ui.js` uses `window.WebBuilderModals`, `window.WebBuilderToast`
  and `window.WebBuilderUtils.escapeHtml`.
- Nothing outside this folder touches `supabase-data.js`/`supabase-ui.js`
  directly — the only outside touch point is the `#btn-cloud` button in
  `web.html`, which `supabase-ui.js` binds to itself.

## Database schema

```text
projects (id, user_id, name, slug, updated_at)
   ↓ 1:n
pages (id, project_id, name, slug, content [JSON snapshot], updated_at)
```

A page's `content` is exactly the result of
`WebBuilderStorage.createSnapshot()` — the same structure used for local
save and undo/redo.

## Where to look for what

- **Only auth behavior changes** → `supabase-data.js` is enough.
- **Only the cloud modal (text, buttons, layout) changes** →
  `supabase-ui.js` is enough.
- **New DB field/table** → `supabase-data.js` + a check on RLS/migration.
