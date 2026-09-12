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
├── css/
│   ├── README.md          CSS architecture, see there for details
│   └── *.css
└── js/
    ├── README.md          module overview, see there for details
    ├── builder.js          bootstrap / load order
    ├── *.js                domain modules (state, canvas, cart, products, ...)
    └── Supabase/           Supabase client, auth, project/page CRUD, cloud modal UI
```

## Core architecture at a glance

- **One central state**: `js/state.js` defines `window.WebBuilderState` — the
  single source of truth for elements, products, cart, header/footer,
  background, zoom, history.
- **Pub/sub instead of direct coupling**: modules change state and call
  `state.notify(domain, action, payload)`; other modules listen via
  `state.subscribe(fn)` for the domains they care about (`"elements"`,
  `"products"`, `"cart"`, `"preview"`, `"background"`, `"selection"`).
  Header/footer changes are the one exception — see `js/README.md`'s
  "Event conventions" section.
- **One serialization format for everything**: `js/storage.js` →
  `createSnapshot()` / `applySnapshot()`. Shared by local save, undo/redo
  **and** Supabase cloud save. A new persistable property must be added
  **here**, or it's lost on save/load.
- **One module per domain**, self-initializing on load
  (`DOMContentLoaded`), exposing its API under `window.WebBuilderXxx`.
  Details: see `js/README.md`.
- **Load order matters**: `js/builder.js` loads all modules in sequence via
  `document.write`. `products.js` **must load before** `cart.js` (cart.js
  references products only via `window.WebBuilderProducts`).

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
2. No drive-by refactors — if a structural improvement seems useful,
   propose it instead of doing it unasked.
3. Always add new persistable state fields to `storage.js` too
   (`createSnapshot`/`applySnapshot`).
4. Keep new comments short (why, not bug history). History belongs in
   commit messages.
5. Comments and READMEs are written in English; chat with the developer
   stays in German.
6. Before editing any file, make sure you actually have its complete,
   untruncated current content — if you're unsure, say so instead of
   guessing or reconstructing from memory. A truncated file that gets
   pasted back into the repo as-is causes a silent JS syntax error: the
   whole script fails to run, its `window.WebBuilderXxx` API is never
   defined, and every other module's optional-chaining call into it
   (`window.WebBuilderXxx?.method?.()`) fails silently with no console
   error. This exact issue previously made the header/footer bars
   disappear completely (see `js/header-footer.js` fix history in git).

## Known technical debt

- `inspector.js`, `cart.js`, `elements.js`, `preview.js` are densely
  written (many statements per line) — harder to read than the rest of the
  project; should be unified to the rest of the codebase's style
  (multi-line, one statement per line) next time they're touched.
- `web.html` duplicates the click-action `<select>` option list (10
  options) and the text-format toolbar markup once for normal elements
  (`#prop-*`) and once for header/footer bar items (`#bar-prop-*`),
  because `inspector.js` and `header-footer.js` render two separate,
  mutually exclusive panels. Not unified — would need a shared HTML/
  templating step across both files plus a `web.html` change, so treat it
  as a structural task (plan first, see rule 2 above) if ever tackled.

> Note for future AI sessions: this list reflects only what is genuinely
> still open. Items that get fixed should be removed here, not left
> marked "done" — completed work stays in git/chat history instead.
