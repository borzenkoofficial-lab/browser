# NEXUS Business Browser

**NEXUS Business Browser** — Windows-first browser workspace for B2B research and local prospect management.

The current codebase is an early MVP foundation. It combines a Chromium-powered browser window with a local company workspace. It is not yet a production release.

## Current implementation

- Electron + Chromium `WebContentsView` browser tabs
- Address/search bar with HTTP(S)-only URL validation
- Back, forward, reload, tab creation and tab closing
- Local browser bookmarks and visit history
- Local prospect records persisted in the Electron user-data directory
- Company cards with industry, contact details, status, source and notes
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
npm install
npm run dev
npm test
npm run build
npm run dist:win
```

The Windows installer is generated under `release/`. The GitHub Actions workflow is configured to publish it as a workflow artifact after a successful Windows build.

## Local data

Prospects, bookmarks and history are stored under Electron's application user-data directory. No application server or paid AI provider is required for the current MVP.

## Current limitations

- Search starts a query in the selected search engine; it does not crawl the web or bypass site restrictions.
- Page extraction only runs when the user clicks **Save company**. Extracted emails and phone numbers are suggestions and must be verified before use.
- No AI provider integration, cloud sync, team accounts, licensing server or automatic update service is implemented yet.
- Browser extension compatibility, advanced download management, password synchronization and full browser-profile import/export are not implemented.
- The installer is not code-signed. Windows SmartScreen warnings may occur.
- The project has not yet been verified by a successful local Windows build. Treat CI results as authoritative once a run completes.

## Security notes

Remote pages do not receive Node.js access or the app's preload bridge. The renderer uses context isolation and sandboxing. New-window requests are restricted to HTTP(S) and opened externally. Page extraction is user-triggered and limited to visible page content. Do not use this browser to bypass access controls or collect data contrary to source terms or applicable privacy law.
