# TrustLens Next Features

This is the focused backlog after the Gemma/OpenRouter demo, Evidence Analytics, Score Trace, Local Case History, and compact Case Packet work.

## 1. Chrome Extension Companion

Goal: make the "before clicking" story feel real.

Scope:

* Context menu action: "Analyze with TrustLens".
* Popup with selected text preview and risk result.
* Local API target setting, defaulting to `http://127.0.0.1:8000`.
* No remote browsing and no credential capture.

## 2. Realistic Screenshot Fixtures

Goal: improve the video demo and multimodal story.

Scope:

* Safe synthetic screenshots for courier, bank, lottery, romance, and QR scams.
* Keep fixtures local and clearly synthetic.
* Add tests that OCR fallback samples still map to expected risk bands.

## 3. MCP Demo Script

Goal: prove the MCP layer without relying on a live external client during judging.

Scope:

* Small script that sends JSON-RPC requests to `trustlens-mcp`.
* Print redaction, domain inspection, scoring, and report draft outputs.
* Include a short terminal recording path in the video script.

## 4. Deploy Story

Goal: make the project easy to run from a clean machine or demo host.

Scope:

* Docker build and run instructions.
* Health endpoint screenshot.
* Environment variable checklist for Gemini OCR and OpenRouter Gemma.

## 5. Provider Settings Panel

Goal: make demo state transparent without exposing secrets.

Scope:

* Show selected OpenRouter model.
* Show live/fallback status.
* Add a "run offline demo mode" toggle that only changes UI/sample behavior, not server secrets.
