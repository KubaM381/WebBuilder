# js/ — Architecture map

No bundler, no framework. Every module attaches its public API to
`window.WebBuilderXxx`. `builder.js` loads every other file in a fixed
order via `document.write` — order matters (exception: the three
`type="module"` Supabase files at the end, resolved by the browser via
ES import).

This file is only a map. For "what does file X do" and "what must load
before/after it", open the README of the folder that file lives in.

## Folders

| Folder | Domain | README |
|---|---|---|
| `core/` | Shared state, utils, storage/history — everything else depends on this | `core/README.md` |
| `canvas/` | Canvas rendering, canvas-element CRUD, icon registry, shared drag/alignment + drop-indicator, Phase 2 flow-layout data + renderer | `canvas/README.md` |
| `editor/` | Right-hand properties panel for canvas elements + the background editor + the Phase 2 flow-layout panel | `editor/README.md` |
| `layout/` | Real page header/footer: data, canvas rendering, inspector panel | `layout/README.md` |
| `shop/` | Products + cart, incl. the cart focus editor | `shop/README.md` |
| `ui/` | Cross-domain UI helpers: toast, modal, shared markup, sidebar tabs | `ui/README.md` |
| `Supabase/` | Supabase client, auth, project/page CRUD, cloud modal UI | `Supabase/README.md` |
| `pages/` | Reserved for a future multi-page client feature — currently empty | — |

## Root-level files (no subfolder)

| File | Purpose | API |
|---|---|---|
| `builder.js` | Bootstrap: fixes the load order for every module via `document.write`, then kicks off the initial render on `DOMContentLoaded`. Read this first for the exact, current load order — its own comments explain each constraint. | — (orchestrator only) |
| `toolbar.js` | Top toolbar: zoom (delegates to `canvas/canvas.js`), undo/redo (via `core/storage.js`), local save binding. `refreshAllDomains()` re-renders every affected UI area after undo/redo or a cloud load. | `window.WebBuilderToolbar` |
| `export.js` | Builds a static HTML document (header/elements/footer) from the current state for the export button. Pure snapshot-to-HTML renderer, no own state. | `window.WebBuilderExport` |
| `preview.js` | Preview mode (hides editor chrome) + the click-action runtime used in preview/live mode (scroll, browser history, open URL, add to cart, open cart drawer, open modal, show message). | `window.WebBuilderPreview`, `window.WebBuilderActionRuntime` |

## Conventions

- One central state: `window.WebBuilderState` (`core/state.js`) — no module keeps its own parallel state.
- Pub/sub: `state.notify(domain, action, payload)` / `state.subscribe(fn)`. Header/footer is the one exception — it dispatches its own `webbuilder:header-footer-change` CustomEvent instead (see `layout/README.md`).
- One serialization format: `core/storage.js`'s `createSnapshot()`/`applySnapshot()`, used by local save, undo/redo and Supabase alike.
- One module per domain, exposing exactly one `window.WebBuilderXxx` object, even when split across several files (e.g. `shop/`'s four `cart-editor-*.js` files all extend `window.WebBuilderCartFocus`).

## Load order

Folder-level chain (see each folder's README for the order of files within it):
