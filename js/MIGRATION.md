# Builder migration contract

The editor is being migrated from `builder-legacy.js` to modular services without changing the UI contract all at once.

## Current ownership

- `state.js` — shared editor state registry
- `storage.js` — snapshots, localStorage and history persistence helpers
- `history.js` — undo/redo service
- `canvas.js` — canvas coordinates, zoom and drag helpers
- `elements.js` — element data CRUD
- `inspector.js` — selected-element updates
- `header-footer.js` — header/footer data operations
- `cart.js` — cart/product data operations
- `legacy-bridge.js` — controlled connection point to the legacy editor
- `builder-legacy.js` — still the live DOM/editor implementation for the remaining domains

## Migration status

### Step 1 — Cart + products

**Data service prepared; live legacy renderer is not yet switched.**

### Step 2 — Header + footer

**Complete.** The legacy editor no longer owns a separate header/footer state container. Its header/footer reads and writes go through `WebBuilderHeaderFooter`, while the service remains responsible for normalization and persistence hydration. Undo/redo snapshots restore the shared header/footer state as well.

### Next

3. Elements + inspector
4. Canvas/zoom/drag
5. Preview/modals
6. Remove obsolete legacy state and rename the remaining implementation

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
