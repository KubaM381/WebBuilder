# Builder migration contract

The editor is being migrated from `builder-legacy.js` to modular services without changing the UI contract all at once.

## Current ownership

- `state.js` — shared editor state registry + state-change event bus
- `storage.js` — snapshots, localStorage and history persistence helpers
- `history.js` — undo/redo service
- `canvas.js` — central canvas facade
- `canvas-viewport.js` — zoom, coordinate conversion and canvas sizing
- `canvas-interaction.js` — reusable drag interaction
- `canvas-renderer.js` — modular rendering of placed canvas elements
- `canvas-runtime.js` — authoritative live canvas controls and reactive render bridge
- `icon-registry.js` — shared built-in/custom icon registry
- `elements.js` — shared element state + CRUD + legacy compatibility proxy
- `inspector.js` — selected-element service
- `inspector-actions-runtime.js` — live click-action inspector UI
- `inspector-properties-runtime.js` — live text/style/image inspector UI
- `inspector-special-runtime.js` — live icon/shape/modal/message-specific inspector UI
- `header-footer.js` — header/footer data operations
- `products.js` — authoritative product normalization + CRUD
- `cart.js` — authoritative cart data operations; delegates all product operations to `products.js`
- `legacy-bridge.js` — controlled connection point to the remaining legacy editor
- `builder-legacy.js` — remaining legacy editor implementation; canvas is no longer its visual source of truth

## Migration status

### Step 1 — Legacy canvas removal / takeover

**Complete from the runtime-ownership perspective.** The modular canvas renderer owns the visible canvas, zoom, coordinate conversion, dragging and element selection. The renderer now uses capture-phase click handling so legacy bubble handlers cannot take control of modular elements. `canvas-runtime.js` also watches for external legacy canvas DOM mutations and immediately reasserts the modular render. The old canvas implementation remains physically inside `builder-legacy.js` for now only because the file also contains the still-migrating non-canvas editor domains; those obsolete canvas functions are now dead transitional code and are the next cleanup target.

### Step 2 — Remaining UI domains

**Partially migrated.** Header/footer, products, cart, preview, modals and inspector runtimes already have modular services. Remaining work is to switch the last legacy DOM event/render ownership for these domains and remove their duplicated local state/functions.

### Step 3 — Delete legacy implementation

After Step 2, remove the obsolete legacy functions/domain state, verify save/load, undo/redo and preview, then delete `builder-legacy.js` and make `builder-core.js` a pure modular entry point.

## Next

1. Remove the now-dead canvas/zoom/drag/render code from `builder-legacy.js` when the remaining legacy domains are safely isolated.
2. Switch remaining product/cart/header/footer/preview DOM event ownership to their modular runtimes.
3. Remove duplicated legacy state domain by domain.
4. Verify save/load, undo/redo, preview and all inspector interactions after each removal.
5. Delete `builder-legacy.js` and simplify `builder-core.js` to the final modular architecture.

## Integration rule

`builder-legacy.js` must not be rewritten wholesale during the migration. Each state domain is moved behind a small adapter and switched one domain at a time.

For each remaining domain:

1. Read the existing legacy behaviour.
2. Register `read()` and `write()` through the migration/bridge layer where appropriate.
3. Switch the legacy functions to the modular service.
4. Verify save/load and undo/redo.
5. Only then remove the duplicated local variables and functions.

## Safety rule

Do not create a second independent state container. `WebBuilderState` and the domain services are the shared state; legacy locals may remain only for domains that have not yet been migrated.

Do not expose Supabase service-role/secret keys in frontend code.
