js/
├── builder.js            bootstrap / load order
├── state.js               shared state + event system + utils
├── storage.js              snapshots, local save, undo/redo service
├── elements.js             canvas elements (CRUD) + icon registry
├── products.js             product management (CRUD + tab UI)
├── cart.js                 cart (data + drawer + config UI)
├── canvas.js               rendering, zoom, drag & drop, background
├── ui/                      cross-domain UI helpers, no own business data
│   ├── toast.js             toast notifications
│   ├── shared-markup.js     shared HTML for #prop-*/#bar-prop-* (see below)
│   └── modals.js            generic modal + positioned messages
├── inspector.js            properties panel for canvas elements
├── toolbar.js               zoom buttons, undo/redo buttons, save
├── header-footer.js        header/footer (data + rendering + inspector)
├── export.js                static HTML export
├── preview.js                preview mode + click-action runtime
├── README.md                 this file
└── Supabase/                 see its own README
    ├── supabase-config.js
    ├── supabase-data.js
    ├── supabase-ui.js
    └── README.md
