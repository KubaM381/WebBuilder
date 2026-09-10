from pathlib import Path
import re

p = Path('js/builder-legacy.js')
s = p.read_text(encoding='utf-8')

exact = [
    ('let elements = []; // Canvas-Elemente', 'const elements = window.WebBuilderElements.createLegacyProxy(); // shared element state'),
    ('elements = prev.elements;', 'WebBuilderElements.replaceAll(prev.elements);'),
    ('elements = state.elements || [];', 'WebBuilderElements.replaceAll(state.elements || []);'),
    ('elements = elements.filter(el => el.id !== selectedElementId);', 'WebBuilderElements.remove(selectedElementId);'),
    ('elements = [];\n      selectedElementId = null;', 'WebBuilderElements.clear();\n      selectedElementId = null;'),
    ('selectedElementId = id;\n    const item = elements.find(el => el.id === id);', 'WebBuilderElements.setSelected(id);\n    selectedElementId = WebBuilderState.selectedElementId;\n    const item = WebBuilderElements.getSelected();'),
]

for old, new in exact:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly 1 occurrence, found {count}: {old[:80]}')
    s = s.replace(old, new)

# Only assignment statements, never the declaration `let selectedElementId = null`.
pattern = re.compile(r'^(\s*)selectedElementId = null;$', re.MULTILINE)
matches = list(pattern.finditer(s))
if len(matches) < 2:
    raise SystemExit(f'Expected multiple deselection assignments, found {len(matches)}')
s = pattern.sub(lambda m: m.group(1) + 'WebBuilderElements.setSelected(null);\n' + m.group(1) + 'selectedElementId = null;', s)

# The shared service is the source of truth; this local variable is only a
# rendering compatibility mirror for the still-monolithic DOM implementation.
s = s.replace('WebBuilderElements.replaceAll(prev.elements);\n    cartItems', 'WebBuilderElements.replaceAll(prev.elements);\n    selectedElementId = WebBuilderState.selectedElementId;\n    cartItems', 1)
s = s.replace('WebBuilderElements.replaceAll(state.elements || []);\n      cartItems', 'WebBuilderElements.replaceAll(state.elements || []);\n      selectedElementId = WebBuilderState.selectedElementId;\n      cartItems', 1)

p.write_text(s, encoding='utf-8')
print('step3 patch applied')
