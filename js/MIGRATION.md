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
- `builder-legacy.js` — **still the live DOM/editor implementation and current source of truth**

## Next integration rule

`builder-legacy.js` must not be rewritten wholesale during the migration. Instead, each state domain is moved behind a small adapter and switched one domain at a time.

Recommended order:

1. Cart + products
2. Header + footer
3. Elements + inspector
4. Canvas/zoom/drag
5. Preview/modals
6. Remove obsolete legacy state and rename the remaining implementation

For each domain:

1. Read the existing legacy behaviour.
2. Register `read()` and `write()` through `WebBuilderLegacyBridge`.
3. Switch the legacy functions to the modular service.
4. Verify save/load and undo/redo.
5. Only then remove the duplicated local variables.

## Safety rule

Do not create a second independent state container. `WebBuilderState` is the future shared state; the legacy locals exist only temporarily until their domain is migrated.

Do not expose Supabase service-role/secret keys in frontend code.
