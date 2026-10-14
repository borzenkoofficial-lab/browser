# NEXUS Business Browser

Business-first Windows browser for researching companies, organizing prospects, and moving public business information into a local workspace.

## Current direction

- Electron + Chromium web contents for real website navigation
- React + TypeScript desktop interface
- Local-first prospect records and CSV workflows
- Secure renderer/preload boundary; no Node.js access from remote pages
- Windows NSIS installer

## Development

Requirements: Node.js LTS and npm.

```powershell
npm install
npm run dev
npm test
npm run build
npm run dist:win
```

## Product roadmap

1. Browser shell, navigation, tabs, bookmarks, history and downloads
2. Local prospect workspace with deduplication, filters and CSV import/export
3. Page-assisted company capture with explicit user action
4. AI research summaries through an optional user-configured provider
5. Hardening, update strategy, licensing and closed pilot

## Security notes

Remote pages are rendered in sandboxed web contents with context isolation and Node integration disabled. The application does not promise to bypass logins, paywalls, anti-bot controls, or site access restrictions. Verify each source's terms and applicable privacy law before automating collection.
