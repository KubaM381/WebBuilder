# Builder migration contract

The WebBuilder editor now runs on the modular runtime architecture. The former monolithic `builder-legacy.js` implementation has been removed.

## Current ownership

- `state.js` — shared editor state registry + state-change event bus
- `storage.js` — snapshots, localStorage and history persistence helpers
- `history.js` — undo/redo service
- `canvas.js` — central canvas facade
- `canvas-viewport.js` — zoom, coordinate conversion and canvas sizing
- `canvas-interaction.js` — reusable drag interaction
- `canvas-renderer.js` — modular rendering of placed canvas elements
- `canvas-runtime.js` — authoritative live canvas controls and reactive rendering
- `icon-registry.js` — shared built-in/custom icon registry
- `elements.js` — shared element state + CRUD
- `inspector.js` — selected-element service
- `inspector-actions-runtime.js` — live click-action inspector UI
- `inspector-properties-runtime.js` — live text/style/image inspector UI
- `inspector-special-runtime.js` — live icon/shape/modal/message-specific inspector UI
- `header-footer.js` — header/footer data operations
- `header-footer-runtime.js` — live header/footer editor UI
- `products.js` — authoritative product normalization + CRUD
- `products-runtime.js` — live product editor UI
- `cart.js` — authoritative cart data/config operations
- `cart-runtime.js` — live cart UI
- `cart-config-runtime.js` — live cart configuration UI
- `modals.js` — modal service
- `preview.js` — editor/preview mode service
- `migration-coordinator.js` — persisted project hydration and domain registry
- `runtime-check.js` — modular runtime health check
- `builder-core.js` — final modular orchestration/initialization layer

## Migration status

### Step 1 — Canvas

**Complete.** Canvas rendering, zoom, coordinate conversion, dragging and element selection are owned by the modular canvas stack.

### Step 2 — Remaining UI domains

**Complete.** Inspector, products, cart, cart configuration, header/footer, modals and preview are owned by modular services/runtimes.

### Step 3 — Remove legacy implementation

**Complete.** `builder-legacy.js`, `legacy-canvas-takeover.js` and `legacy-bridge.js` have been removed. `builder.js` now loads only modular services, and `builder-core.js` no longer loads a legacy implementation.

## Final architecture rule

There is one shared state source: `WebBuilderState` plus its domain services. No legacy editor or second independent builder state is loaded at runtime.

Save/load and undo/redo continue to use the shared storage/history services. Supabase service-role/secret keys must never be exposed in frontend code.
