# TrustLens Next Features

This is the focused backlog after the Gemma/OpenRouter demo, Evidence Analytics, Score Trace, Local Case History, and compact Case Packet work.

## 1. Chrome Extension Companion *(implemented)*

Goal: make the "before clicking" story feel real.

Scope:

* Context menu action: "Analyze with TrustLens".
* Popup with selected text preview and risk result.
* Local API target setting, defaulting to `http://127.0.0.1:8000`.
* No remote browsing and no credential capture.
* Implemented in `extension/` as an unpacked Manifest V3 demo extension.

## 2. Realistic Screenshot Fixtures *(implemented)*

Goal: improve the video demo and multimodal story.

Scope:

* Safe synthetic screenshots for courier, bank, lottery/prize, and QR scams.
* Keep fixtures local and clearly synthetic.
* Add tests that OCR fallback samples still map to expected risk bands.
* Implemented with `web/public/fixtures/screenshots/`, `fixtures/messages/`, and deterministic OCR fixture markers.

## 3. MCP Demo Script *(implemented)*

Goal: prove the MCP layer without relying on a live external client during judging.

Scope:

* Small script that sends JSON-RPC requests to `trustlens-mcp`.
* Print redaction, domain inspection, scoring, and report draft outputs.
* Include a short terminal recording path in the video script.
* Implemented as `python scripts/mcp_demo.py`.

## 4. Deploy Story *(helper prepared)*

Goal: make the project easy to run from a clean machine or demo host.

Scope:

* Docker build and run instructions.
* Health endpoint screenshot.
* Environment variable checklist for Gemini OCR and OpenRouter Gemma.
* Dockerfile and `.dockerignore` are included, but the primary handoff remains `web/dist` plus the FastAPI app for simple demo hosting.

## 5. Provider Settings Panel

Goal: make demo state transparent without exposing secrets.

Scope:

* Show selected OpenRouter model.
* Show live/fallback status.
* Add a "run offline demo mode" toggle that only changes UI/sample behavior, not server secrets.

## 6. Static Hosting Adapter

Goal: make a purely static public demo possible without exposing provider keys.

Scope:

* Add a configurable hosted API base URL.
* Show a clear "API disconnected" state when static hosting has no backend.
* Keep OpenRouter and Gemini keys only on a server-side endpoint.
