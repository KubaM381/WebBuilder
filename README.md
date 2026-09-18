# WebBuilder

Visual drag-and-drop website builder (vanilla JS, no build tool/framework).
Users place elements via drag & drop, style header/footer, manage products
and a cart, and save projects locally or to Supabase.

## Project structure

```text
WebBuilder/
├── web.html               single HTML entry page (editor UI)
├── index.html              marketing/landing page — intentionally kept,
│                           not part of the builder app itself
├── README.md               this file
├── docs/
│   └── CART_EDITOR_TASKS.md   active task list for the current cart focus
│                           editor round — read this before touching any
│                           js/shop/cart-editor-*.js file
├── css/
│   ├── README.md           CSS file map
│   └── *.css
└── js/
    ├── README.md            signpost: architecture, folder map, load order
    ├── core/README.md       state, utils, storage/history
    ├── canvas/README.md     canvas rendering, elements, icons, drag/alignment
    ├── editor/README.md     right-hand properties panel + background editor
    ├── layout/README.md     header/footer domain
    ├── shop/README.md       products + cart (incl. cart focus editor)
    ├── ui/README.md         toast/modal/tabs/shared markup
    └── Supabase/README.md   Supabase client, auth, cloud modal
```

## Core architecture at a glance

- **One central state**: `js/core/state.js` (`window.WebBuilderState`) is
  the single source of truth for elements, products, cart, header/footer,
  background, zoom, history.
- **Pub/sub instead of direct coupling**: `state.notify(domain, action,
  payload)` / `state.subscribe(fn)`. Exception: header/footer changes use
  their own CustomEvent instead — see `js/layout/README.md`.
- **One serialization format**: `js/core/storage.js`
  (`createSnapshot()`/`applySnapshot()`) — shared by local save, undo/redo
  and Supabase cloud save.
- **One module per domain**, self-initializing on `DOMContentLoaded`,
  exposed as `window.WebBuilderXxx`. A domain can span several files (see
  the relevant `js/*/README.md`).
- **Load order matters**: `js/builder.js` loads every module in a fixed
  sequence via `document.write`. See `js/README.md` for the summary and
  `builder.js`'s own comments for the exact reasoning behind each
  constraint.

## Supabase

Schema, auth flow and file split: see `js/Supabase/README.md`.

## Security

- `js/Supabase/supabase-config.js` may contain **only** the publishable
  key, never a secret/service-role key.
- Access control runs through Supabase Row Level Security (RLS) at the DB
  level, not client-side logic.

## Working on this project (including AI assistants)

1. Before any change: read only the files actually affected — check the
   relevant `js/*/README.md` for "who does what" first.
2. Picking up cart-focus-editor work? Read `docs/CART_EDITOR_TASKS.md`
   first — the current, authoritative task list for that area.
3. No drive-by refactors — propose a structural change instead of doing
   it unasked.
4. New persistable state fields always need an entry in `core/storage.js`
   too (`createSnapshot`/`applySnapshot`). Nested fields under an
   already-covered top-level object (`cartConfig`, `background`, …)
   don't — only a genuinely new top-level `state.*` field does.
5. Comments and READMEs are written in English; chat with the developer
   stays in German. UI copy shown to end users (labels, button text,
   toasts) stays German.
6. Before editing any file, make sure you actually have its complete,
   untruncated current content — if unsure, say so instead of guessing or
   reconstructing from memory. A truncated file pasted back as-is causes
   a silent JS syntax error: the whole script stops running, its
   `window.WebBuilderXxx` API is never defined, and every
   optional-chaining call into it (`window.WebBuilderXxx?.method?.()`)
   fails silently with no console error.
