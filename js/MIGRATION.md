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
- `canvas-runtime.js` — live canvas controls and reactive render bridge
- `legacy-canvas-takeover.js` — transitional guard that reasserts modular canvas rendering after legacy DOM mutations
- `icon-registry.js` — shared built-in/custom icon registry
- `elements.js` — shared element state + CRUD + legacy compatibility proxy
- `inspector.js` — selected-element service
- `inspector-actions-runtime.js` — live click-action inspector UI
- `inspector-properties-runtime.js` — live text/style/image inspector UI
- `inspector-special-runtime.js` — live icon/shape/modal/message-specific inspector UI
- `header-footer.js` — header/footer data operations
- `products.js` — authoritative product normalization + CRUD
- `cart.js` — authoritative cart data operations; delegates all product operations to `products.js`
- `legacy-bridge.js` — controlled connection point to the legacy editor
- `builder-legacy.js` — still contains the remaining legacy editor implementation

## Migration status

### Step 1 — Cart + products

**Data layer split complete; live legacy UI is not yet switched.** `products.js` is now the single product data service, including discount-price normalization and product CRUD. `cart.js` owns only cart state and delegates product operations to `products.js`. The migration coordinator registers products separately and hydrates them independently.

### Step 2 — Header + footer

**Complete.** The legacy editor no longer owns a separate header/footer state container. Its header/footer reads and writes go through `WebBuilderHeaderFooter`, while the service remains responsible for normalization and persistence hydration. Undo/redo snapshots restore the shared header/footer state as well.

### Step 3 — Elements + inspector

**Core inspector migration complete.** `WebBuilderState.elements` is the authoritative element collection. The inspector now owns selection, text/content, size, color, font family, text formatting, alignment, image URL/local image input and deletion through modular runtimes. Click-action editing and element-specific icon/shape/modal/message controls are also modular and use the shared element service. Legacy compatibility remains only for the not-yet-migrated editor internals.

### Step 4 — Canvas/zoom/drag

**Modular canvas ownership active.** The canvas facade, viewport, interaction and renderer are implemented and loaded before the legacy editor. Canvas state is persisted and hydrated through the migration coordinator. The renderer consumes the shared icon registry and reacts to shared element, selection, preview and canvas/background state changes. `legacy-canvas-takeover.js` now observes legacy canvas DOM mutations and reasserts the modular renderer, so the legacy canvas output is transitional rather than the visual source of truth. The remaining work is to remove the duplicated legacy canvas functions and eventually delete the legacy file.

### Step 5 — Preview + runtime hardening

**In progress.** Preview mode is owned by `preview.js` and publishes mode changes through the shared state event bus. Canvas rendering reacts to those changes. Runtime checks expose the modular inspector, product, cart and special inspector services so missing migration dependencies are visible.

## Next

6. Migrate remaining product/cart/header/footer/preview DOM event ownership from `builder-legacy.js`
7. Remove obsolete legacy canvas/zoom/drag/render functions and their local state
8. Remove remaining duplicated legacy state domain by domain
9. Verify save/load, undo/redo, preview and all inspector interactions after each removal
10. Delete `builder-legacy.js` after all domains have been switched and verified

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
