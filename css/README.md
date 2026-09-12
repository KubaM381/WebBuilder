# CSS Architecture

The CSS is split by responsibility. Each file covers exactly one UI area.
`styles.css` is just the central entry point (`@import` of all modules)
plus the `body.preview-mode` overrides.

## Files

| File | Responsible for |
|---|---|
| `styles.css` | Central entry point (`@import` of all modules) plus `body.preview-mode` overrides. Kept centralized here (not its own file) since they cut across sidebar, inspector, canvas and zoom controls. |
| `base.css` | CSS variables (colors, shadows, plus shared one-off tones like `--border-muted`/`--primary-light-hover` used in 2+ files so no hex code needs copy-pasting), reset, base typography, `.hidden`, `.divider`. |
| `layout.css` | Coarse app skeleton (`.app-body`). |
| `toolbar.css` | Top toolbar + all `.btn*` button variants (reused project-wide). |
| `sidebar.css` | Left sidebar: tabs, palette grid, form rows (`.item-row`), product cards, item-row text/width helpers. |
| `inspector.css` | Right-hand properties panel, text-format toolbar. |
| `canvas.css` | Canvas area, zoom controls, header/footer bars (`.builder-bar`), bar-item interaction. |
| `elements.css` | Element palette (`.draggable-item`) and placed canvas elements (`.placed-element`). |
| `modals.css` | Toasts, drawer (cart), generic modal, and reusable modal-body layout helpers (`.modal-stack`, `.modal-row`, `.pick-list`, ...) used by `js/Supabase/supabase-ui.js` and `cart.js`. |
| `responsive.css` | Small-screen adjustments (≤1024px). |

## Rules

1. Before any change, check whether the rule already exists somewhere —
   no duplicate selectors/overrides.
2. Don't create a new CSS file if an existing one fits topically (e.g.
   product-specific classes belong in `sidebar.css` since they're part of
   the products tab).
3. Don't rename selectors/class names without reason — JS sets them via
   `className`/`classList`.
4. `!important` is intentionally used only as an escape hatch for
   `body.preview-mode` overrides. Avoid it elsewhere.
5. Keep responsive rules centralized in `responsive.css`, not scattered
   across module files.
6. New JS-driven UI should use CSS classes, not inline `style="..."`
   strings in template literals — add the class here (`modals.css` for
   modal/layout helpers, `sidebar.css` for sidebar components) instead.
7. A literal color value used in **2 or more places** belongs in a
   `:root` variable in `base.css`, not copy-pasted as a hex code — even
   for small "one-off" tones like a hover shade or a muted border grey
   (see `--primary-light-hover`, `--border-muted`).

## To review (usage unclear)

Defined but no confirmed active use in current JS. Verify via full-repo
search before deleting:

- `.mini-check` (`sidebar.css`)
- `.item-row-drag-handle` (`sidebar.css`) — likely prepared for an
  unfinished drag-reorder feature (e.g. sortable milestones/recommendations).

## Known gaps (not yet fixed)

None currently tracked. Resolved items stay in git/chat history instead of
being marked "done" here.
