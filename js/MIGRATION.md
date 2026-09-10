# Builder migration contract

The editor is being migrated from `builder-legacy.js` to modular services without changing the UI contract all at once.

## Current ownership

- `state.js` — shared editor state registry
- `storage.js` — snapshots, localStorage and history persistence helpers
- `history.js` — undo/redo service
- `canvas.js` — central canvas facade
- `canvas-viewport.js` — zoom, coordinate conversion and canvas sizing
- `canvas-interaction.js` — reusable drag interaction
- `canvas-renderer.js` — modular rendering of placed canvas elements
- `icon-registry.js` — shared built-in/custom icon registry
- `elements.js` — shared element state + CRUD + legacy compatibility proxy
- `inspector.js` — selected-element service
- `header-footer.js` — header/footer data operations
- `cart.js` — cart/product data operations
- `legacy-bridge.js` — controlled connection point to the legacy editor
- `builder-legacy.js` — still the live DOM/editor implementation for the remaining domains

## Migration status

### Step 1 — Cart + products

**Data service prepared; live legacy renderer is not yet switched.** Discount-price normalization is supported by `cart.js`.

### Step 2 — Header + footer

**Complete.** The legacy editor no longer owns a separate header/footer state container. Its header/footer reads and writes go through `WebBuilderHeaderFooter`, while the service remains responsible for normalization and persistence hydration. Undo/redo snapshots restore the shared header/footer state as well.

### Step 3 — Elements + inspector

**Complete.** `WebBuilderState.elements` is now the authoritative element collection. The legacy editor uses the `WebBuilderElements` compatibility proxy for existing array operations, loads/restores through `replaceAll()`, removes through the element service, and resolves the selected element through the shared service. Selection changes are synchronized through `WebBuilderElements.setSelected()`. The migration coordinator registers the elements domain as connected and hydrates persisted elements before the legacy editor starts.

### Step 4 — Canvas/zoom/drag

**Module split complete; live legacy ownership remains.** The canvas facade, viewport, interaction and renderer modules are implemented and loaded before the legacy editor. Canvas state is persisted and hydrated through the migration coordinator. The renderer also consumes the shared icon registry. The remaining work is to switch the live legacy DOM rendering/event wiring to these services and then remove the duplicated legacy canvas implementation.

### Next

5. Preview/modals
6. Switch remaining legacy DOM implementations to modular services
7. Remove obsolete legacy state and eventually delete `builder-legacy.js`

## Integration rule

`builder-legacy.js` must not be rewritten wholesale during the migration. Each state domain is moved behind a small adapter and switched one domain at a time.

For each remaining domain:

1. Read the existing legacy behaviour.
2. Register `read()` and `write()` through the migration/bridge layer where appropriate.
3. Switch the legacy functions to the modular service.
4. Verify save/load and undo/redo.
5. Only then remove the duplicated local variables.

## Safety rule

Do not create a second independent state container. `WebBuilderState` and the domain services are the shared state; legacy locals may remain only for domains that have not yet been migrated.

Do not expose Supabase service-role/secret keys in frontend code.
