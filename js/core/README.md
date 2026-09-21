# js/core/ — Shared state, utils, storage

Everything else in the app depends on these three files. They load first
(see `js/README.md`).

| File | Purpose | API |
|---|---|---|
| `state.js` | `window.WebBuilderState` — the entire application state (elements, sections, products, cart, header/footer, background, zoom, history stacks) plus the event system: `state.subscribe(fn)` and `state.notify(domain, action, payload)`. `schemaVersion` marks the snapshot format (2 = adds `sections`, see `canvas/sections-data.js`); `cartFocusMode`/`cartFocusSelectedPart`/`dragLock` are runtime-only, never persisted. | `window.WebBuilderState` |
| `utils.js` | Shared, stateless helpers: `escapeHtml`, `buildTextStyleCss`, `normalizeInPlace` (normalizes a list in place so existing object references survive, e.g. during an active drag). Must load before any module that reads it at parse time (most of `shop/`, `canvas/canvas.js`, `layout/`). | `window.WebBuilderUtils` |
| `storage.js` | `createSnapshot()`/`applySnapshot()` — the **only** serialization format for the whole project (local save, undo/redo, Supabase). Includes `schemaVersion`/`sections` since Phase 2 — a snapshot missing them (pre-Phase-2 project) just gets the defaults, no migration step needed. `armHistory()`/`commitHistory()` wrap an undo transaction. `normalizeRuntimeState()` calls every domain's own `normalizeState()` after load/apply — this is where legacy-field migrations run. | `window.WebBuilderStorage`, `window.WebBuilderHistory` |

Adding a new persistable top-level `state.*` field? Add it to
`createSnapshot()`/`applySnapshot()` in `storage.js` — nested fields
under an already-covered object (`cartConfig`, `background`, …) don't
need a separate change.
