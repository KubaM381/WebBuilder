from pathlib import Path

p = Path('js/builder-legacy.js')
s = p.read_text(encoding='utf-8')

replacements = [
    ('let elements = []; // Canvas-Elemente', 'const elements = window.WebBuilderElements.createLegacyProxy(); // shared element state'),
    ('elements = prev.elements;', 'WebBuilderElements.replaceAll(prev.elements);'),
    ('elements = state.elements || [];', 'WebBuilderElements.replaceAll(state.elements || []);'),
    ('elements = elements.filter(el => el.id !== selectedElementId);', 'WebBuilderElements.remove(selectedElementId);'),
    ('elements = [];\n      selectedElementId = null;', 'WebBuilderElements.clear();\n      selectedElementId = null;'),
    ('selectedElementId = id;\n    const item = elements.find(el => el.id === id);', 'WebBuilderElements.setSelected(id);\n    selectedElementId = WebBuilderState.selectedElementId;\n    const item = WebBuilderElements.getSelected();'),
]

for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly 1 occurrence, found {count}: {old[:80]}')
    s = s.replace(old, new)

# Every direct deselection now updates the shared selection state as well.
old = 'selectedElementId = null;'
new = 'WebBuilderElements.setSelected(null);\n      selectedElementId = null;'
count = s.count(old)
if count < 2:
    raise SystemExit(f'Expected multiple deselection sites, found {count}')
s = s.replace(old, new)

# Keep the local mirror synchronized after restore/load paths.
s = s.replace('WebBuilderElements.replaceAll(prev.elements);\n    cartItems', 'WebBuilderElements.replaceAll(prev.elements);\n    selectedElementId = WebBuilderState.selectedElementId;\n    cartItems', 1)
s = s.replace('WebBuilderElements.replaceAll(state.elements || []);\n      cartItems', 'WebBuilderElements.replaceAll(state.elements || []);\n      selectedElementId = WebBuilderState.selectedElementId;\n      cartItems', 1)

p.write_text(s, encoding='utf-8')
print('step3 patch applied')
