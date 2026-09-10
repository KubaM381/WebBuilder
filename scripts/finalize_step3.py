from pathlib import Path
p=Path('js/builder-legacy.js')
s=p.read_text(encoding='utf-8')
changes=[
('function getSelected() { return elements.find(el => el.id === selectedElementId); }','function getSelected() { return window.WebBuilderElements.getSelected(); }'),
('if (!isPreviewMode) { selectedElementId = null; selectElement(null); }','if (!isPreviewMode) { WebBuilderElements.setSelected(null); selectedElementId = null; selectElement(null); }'),
('if (isPreviewMode) {\n      selectedElementId = null;\n      renderCanvas();','if (isPreviewMode) {\n      WebBuilderElements.setSelected(null);\n      selectedElementId = null;\n      renderCanvas();')]
for old,new in changes:
    if s.count(old)!=1: raise SystemExit(f'Expected one occurrence: {old}')
    s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
print('final Step 3 integration patch applied')
