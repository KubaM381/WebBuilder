# WebBuilder

Visual drag-and-drop website builder (vanilla JS, no build tool/framework).
Users place elements via drag & drop, style header/footer, manage products
and a cart, and save projects locally or to Supabase.

## Project structure

```text
WebBuilder/
├── web.html              single HTML entry page (editor UI)
├── index.html             marketing/landing page — intentionally kept,
│                          not part of the builder app itself (confirmed
│                          by the project owner, not a "maybe delete" item)
├── README.md              this document
├── docs/
│   └── CART_EDITOR_TASKS.md  active task specification for the current
│                          cart focus editor round — read this before
│                          touching js/shop/cart-*.js
├── css/
│   ├── README.md          CSS architecture, see there for details
│   └── *.css
└── js/
    ├── README.md          module overview, load order, event conventions
    │                      — see there for details
    ├── builder.js          bootstrap / load order (orchestrator only)
    ├── toolbar.js          zoom/undo/redo/save toolbar bindings
    ├── export.js            static HTML export
    ├── preview.js            preview mode + click-action runtime
    ├── core/                shared state, utils, storage/history
    ├── canvas/              canvas rendering, drag/alignment, elements+icons
    ├── editor/              right-hand inspector panel for canvas elements
    ├── layout/              header/footer domain
    ├── shop/                products + cart (data / rendering / focus editor)
    ├── ui/                  cross-domain UI helpers: toast, modals, shared
    │                        inspector markup, sidebar-tab switching
    ├── pages/               reserved for future multi-page client logic
    │                        (currently only rudimentary in Supabase/)
    └── Supabase/            Supabase client, auth, project/page CRUD, cloud modal UI
```

## Core architecture at a glance

- **One central state**: `js/core/state.js` defines `window.WebBuilderState` —
  the single source of truth for elements, products, cart, header/footer,
  background, zoom, history. `js/core/utils.js` provides the shared,
  stateless helpers (`escapeHtml`, `buildTextStyleCss`, `normalizeInPlace`).
- **Pub/sub instead of direct coupling**: modules change state and call
  `state.notify(domain, action, payload)`; other modules listen via
  `state.subscribe(fn)` for the domains they care about (`"elements"`,
  `"products"`, `"cart"`, `"preview"`, `"background"`, `"selection"`).
  Header/footer changes are the one exception — see `js/README.md`'s
  "Event conventions" section.
- **One serialization format for everything**: `js/core/storage.js` →
  `createSnapshot()` / `applySnapshot()`. Shared by local save, undo/redo
  **and** Supabase cloud save. A new persistable property must be added
  **here**, or it's lost on save/load.
- **Shared drag/click + alignment guides**: `js/canvas/alignment.js`
  (`window.WebBuilderAlignment`) owns the pointer-event drag controller and
  Canva-style center/edge alignment-guide snapping (`attachInteraction()`),
  used by `canvas/canvas.js` (canvas elements) and `layout/header-footer.js`
  (bar items). The cart focus editor (`shop/cart-editor.js`) has its own
  pointer handling instead — its stage positions parts/components via a CSS
  transform offset on an unscaled surface, not `attachInteraction()`'s
  absolute left/top model — but it reuses `alignment.js`'s exported
  snapping primitives (`collectSnapTargets`/`snapPosition`/guide-layer
  helpers) so dragging a cart part or component shows the same alignment
  guides as canvas elements and header/footer bar items.
- **One module per domain**, self-initializing on load
  (`DOMContentLoaded`), exposing its API under `window.WebBuilderXxx`.
  Details: see `js/README.md`.
- **Load order matters**: `js/builder.js` loads all modules in sequence via
  `document.write`. `shop/products.js` **must load before**
  `shop/cart-data.js` (cart-data.js references products only via
  `window.WebBuilderProducts`), `js/canvas/alignment.js` **must load
  before** `canvas/canvas.js` and `layout/header-footer.js`, and
  `js/ui/shared-markup.js` **must load before** `editor/inspector.js`/
  `layout/header-footer.js` (see `js/README.md`).

## Supabase schema

```text
projects (id, user_id, name, slug, updated_at)
   └── pages (id, project_id, name, slug, content JSON, updated_at)
```

`content` in `pages` is exactly the result of
`WebBuilderStorage.createSnapshot()` — never build a separate, different
format.

## Security

- The client (`js/Supabase/supabase-config.js`) may contain **only** the
  publishable key, never a secret/service-role key.
- Access control runs through Supabase Row Level Security (RLS) at the DB
  level, not client-side logic.

## For further development (including AI assistants)

1. Before any change: read only the files actually affected (see
   `js/README.md` for "who does what").
2. If you're picking up cart-focus-editor work, read
   `docs/CART_EDITOR_TASKS.md` first — it is the current, authoritative
   task list for that area.
3. No drive-by refactors — if a structural improvement seems useful,
   propose it instead of doing it unasked.
4. Always add new persistable state fields to `core/storage.js` too
   (`createSnapshot`/`applySnapshot`) — note that nested fields under
   `state.cartConfig`/`state.background`/etc. are already covered since
   those top-level objects are cloned whole; only a genuinely **new
   top-level** `state.*` field needs an explicit addition there.
5. Keep new comments short (why, not bug history). History belongs in
   commit messages.
6. Comments and READMEs are written in English; chat with the developer
   stays in German. UI copy shown to end users (labels, button text,
   toasts) stays German, matching the existing app.
7. Before editing any file, make sure you actually have its complete,
   untruncated current content — if you're unsure, say so instead of
   guessing or reconstructing from memory. A truncated file that gets
   pasted back into the repo as-is causes a silent JS syntax error: the
   whole script fails to run, its `window.WebBuilderXxx` API is never
   defined, and every other module's optional-chaining call into it
   (`window.WebBuilderXxx?.method?.()`) fails silently with no console
   error.

## Known technical debt

- `editor/inspector.js`, `shop/cart-*.js`, `canvas/elements.js`,
  `preview.js` are densely written (many statements per line) — harder to
  read than the rest of the project; should be unified to the rest of the
  codebase's style (multi-line, one statement per line) next time they're
  touched.
- `js/editor/background.js` doesn't exist yet — the background editor
  still lives inside `canvas/canvas.js` (`bindBackgroundEditor()`). Split
  it out once that area needs real growth (see `js/README.md`).
- The cart focus editor (`shop/cart-editor.js`) has a small, actively-
  tracked list of open fixes/refinements — see `docs/CART_EDITOR_TASKS.md`
  instead of duplicating that list here.

> Note for future AI sessions: this list reflects only what is genuinely
> still open. Items that get fixed should be removed here, not left
> marked "done" — completed work stays in git/chat history instead.
