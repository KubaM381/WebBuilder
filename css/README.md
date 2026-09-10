# CSS architecture

The Builder CSS is being modularized gradually.

## Current structure

- `styles.css` — legacy/current stylesheet. It remains the active stylesheet during migration.
- `base.css` — global reset, variables and typography.
- `layout.css` — main application layout.
- `toolbar.css` — top toolbar and toolbar controls.
- `sidebar.css` — left editor sidebar and tabs.
- `inspector.css` — right inspector panel.
- `canvas.css` — canvas, zoom and builder surface.
- `elements.css` — palette and placed-element styles.
- `modals.css` — modal/dialog styles.
- `responsive.css` — responsive/mobile/tablet rules.

The new files are currently structural placeholders. `styles.css` remains unchanged and is still loaded by `web.html` so the Builder keeps its current behaviour. CSS rules will be moved in a later controlled migration step, then `web.html` can load the modular files.
