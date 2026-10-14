# NEXUS Business Browser

**NEXUS Business Browser** — Windows-first browser workspace for B2B research and local prospect management.

The current codebase is an early MVP foundation. It combines a Chromium-powered browser window with a local company workspace. It is not yet a production release.

## Current implementation

- Electron + Chromium `WebContentsView` browser tabs
- Address/search bar with HTTP(S)-only URL validation
- Back, forward, reload, tab creation and tab closing
- Local browser bookmarks and visit history
- Local prospect records, bookmarks and visit history persisted in SQLite in the Electron user-data directory
- One-time migration from the previous JSON files, with original files retained and copied to `backups/pre-sqlite`
- Validated repository operations and SQLite integrity checks
- User-triggered SQLite backup and restore from Settings, with a safety backup before restore
- Company cards with industry, contact details, status, source, tags, notes and a timestamped interaction timeline
- Local estimate calculator with itemized customer prices, direct costs, gross profit and margin; estimates are stored in SQLite and included in database backups
- Commercial proposal builder with three print templates, estimate-to-proposal flow, document status, validity date, terms, signature/stamp areas, and print-to-PDF through the system print dialog; documents are stored locally and included in backups
- Production object tracking with estimate linkage, planned budget, daily shift reports, worker-hours, output, revenue, direct costs, productivity and actual gross-profit summaries
- Local finance register for planned and paid income/expenses, categories, object linkage, period filtering, cashflow totals, receivables and planned expenses
- Supplier directory with contact details, payment terms, delivery lead time, internal rating and active/paused status
- Explicit user-triggered extraction of page title, meta description, visible text, email and phone candidates to prefill a company card
- Search workflow for construction, contractors, property managers and other B2B categories
- Search provider selection for Google, Bing and Yandex
- CSV import/export, field validation and duplicate skipping
- Dark desktop interface, local-data status, settings and Windows NSIS installer configuration
- GitHub Actions workflow for tests/build and Windows installer artifact

## Development

Requirements: Node.js 20 LTS or newer and npm.

Run in PowerShell:

```powershell
npm ci
npm run dev
npm test
npm run build
npm run dist:win
```

The Windows installer is generated under `release/` only when explicitly built. The Windows installer CI job is skipped on normal pushes and pull requests; it runs only on manual workflow dispatch. Do not trigger it until an installer is requested. SQLite is provided by the portable `sql.js` WASM build, so no native Node/Electron module rebuild is required.

## Local data

Prospects, bookmarks and history are stored in `nexus.sqlite` under Electron's application user-data directory. On first startup after this update, the application copies any legacy `prospects.json`, `bookmarks.json` and `history.json` files to `backups/pre-sqlite` and imports their records into SQLite. The original JSON files are not deleted. If legacy data cannot be parsed, startup stops with an error rather than silently treating the file as empty.

Use Settings → Backup to create a verified `.sqlite` backup, or restore from an existing backup. Before restoration, the application creates a safety backup of the current database. Keep backup files in a safe location. No application server or paid AI provider is required.

## Current limitations

- Search starts a query in the selected search engine; it does not crawl the web or bypass site restrictions.
- Page extraction only runs when the user clicks **Save company**. Extracted emails and phone numbers are suggestions and must be verified before use.
- No AI provider integration, cloud sync, team accounts, licensing server, or automatic update service is implemented yet.
- Browser extension compatibility, advanced download management, password synchronization and full browser-profile import/export are not implemented.
- The installer is not code-signed. Windows SmartScreen warnings may occur.
- The project has not yet been verified by a successful local Windows build. Treat CI results as authoritative once a run completes.

## Security notes

Remote pages do not receive Node.js access or the app's preload bridge. The renderer uses context isolation and sandboxing. New-window requests are restricted to HTTP(S) and opened externally. Page extraction is user-triggered and limited to visible page content. Do not use this browser to bypass access controls or collect data contrary to source terms or applicable privacy law.
