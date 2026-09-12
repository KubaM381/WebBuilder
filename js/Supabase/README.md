# Supabase-Integration

Alle Supabase-bezogenen Dateien liegen gebündelt in diesem Ordner.

## Dateien

| Datei | Verantwortlich für |
|---|---|
| `supabase-config.js` | Nur die zwei Konstanten `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY`. Enthält **niemals** einen Secret/Service-Role-Key (siehe Kommentar in der Datei + Projektregel 18). |
| `supabase-data.js` | Datenschicht: Client-Erstellung, Auth (Login/Registrierung/Passwort-Reset/Logout), Projekt- und Seiten-CRUD gegen die Tabellen `projects`/`pages`. Enthält **keine** DOM-/UI-Logik. Exponiert `window.WebBuilderSupabase` sowie ES-Exporte. |
| `supabase-ui.js` | UI-Schicht: das komplette Cloud-/Konto-Modal (`#btn-cloud` in `web.html`) — Login-Formular, Projektliste, Seitenverwaltung, Passwort-Reset-Dialog. Importiert alle benötigten Funktionen per ES `import` direkt aus `supabase-data.js`. |

## Warum ES-`import` statt `window.WebBuilderXxx`?

Im restlichen Projekt kommunizieren Module ausschließlich über `window.WebBuilderXxx` (siehe `js/README.md`). Hier ist das anders, weil alle drei Dateien `type="module"` sind — Modul-Skripte werden vom Browser **deferred** (verzögert, nach dem Parsen) ausgeführt. Ein normaler `<script>`-Tag zwischen zwei Modul-Tags würde daher vor dem Modul laufen, und selbst zwei Modul-Tags laufen nicht zwangsläufig in Dokumentreihenfolge synchron zum `window`-Zustand. Ein `import` garantiert dagegen, dass `supabase-data.js` vollständig ausgewertet ist, bevor `supabase-ui.js` darauf zugreift. `window.WebBuilderSupabase` bleibt trotzdem als öffentliche API bestehen (Konsole, Debugging, mögliche künftige Module).

## Abhängigkeiten nach außen

- `supabase-data.js` nutzt `window.WebBuilderStorage` (Snapshot erstellen/anwenden), `window.WebBuilderToolbar` (Refresh nach Laden), `window.WebBuilderCanvas` (Hintergrund-Editor-Refresh) und `window.WebBuilderToast` (Feedback).
- `supabase-ui.js` nutzt `window.WebBuilderModals` (das generische Modal), `window.WebBuilderToast` und `window.WebBuilderUtils.escapeHtml`.
- Nichts außerhalb dieses Ordners greift auf `supabase-data.js`/`supabase-ui.js` zu — der einzige Berührungspunkt von außen ist der Button `#btn-cloud` in `web.html`, an den sich `supabase-ui.js` selbst hängt.

## Datenbank-Schema (Kurzfassung)

```text
projects (id, user_id, name, slug, updated_at)
   ↓ 1:n
pages (id, project_id, name, slug, content [JSON-Snapshot], updated_at)
```

`content` einer Page ist exakt das Ergebnis von `WebBuilderStorage.createSnapshot()` — dieselbe Struktur wie beim lokalen Speichern/Undo-Redo.

## Wann welche Datei lesen?

- **Nur Login/Auth-Verhalten ändern** → `supabase-data.js` reicht.
- **Nur das Cloud-Modal (Text, Buttons, Layout) ändern** → `supabase-ui.js` reicht.
- **Neues Datenbankfeld/neue Tabelle** → `supabase-data.js` + Rücksprache wegen RLS/Migration (Projektregel 17).
