# Changelog

## 1.0.3 - 2026-07-06

Static Gemma demo option.

* Added optional browser-side OpenRouter Gemma enrichment for simple static hosting, configured at deploy time through `web/dist/config.js`.
* Kept the repository demo key empty and documented that public static keys are visible to browser users.
* Updated runtime badges to distinguish Browser Demo fallback from Browser Gemma mode.

## 1.0.2 - 2026-07-06

Public demo clarity and polish release.

* Animated the browser fallback investigation timeline so static hosting no longer jumps straight to a completed report.
* Added a visible Browser Demo badge when the backend API is not reachable.
* Fixed quick sample button edge clipping in the compact sample strip.

## 1.0.1 - 2026-07-06

Public demo and capstone handoff release.

* Fixed static hosting under subpaths such as `/trustlens/` by switching the Vite build and public fixtures to relative asset paths.
* Added visible release versioning across the web footer, Python package metadata, FastAPI metadata, and MCP server info.
* Refreshed the public demo build, release packages, and deployment notes.
* Improved browser fallback logging so static demo samples remain clean when no backend API is connected.
* Polished the App Info modal for a clearer public-repo and judge-facing demo story.

## 1.0.0 - 2026-07-05

Initial TrustLens capstone release.

* Added ADK-style phishing investigation pipeline, FastAPI backend, React dashboard, CLI, MCP server, extension companion, demo fixtures, and release packaging.
