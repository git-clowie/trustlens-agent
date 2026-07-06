# TrustLens Pitch Deck & Presentation Guide

Slide-by-slide outline for a concise capstone presentation.

## Tracked Visual Assets

Use these committed assets for GitHub, Kaggle, and video handoff:

* Repository cover: `docs/assets/cover/trustlens-cover.png`
* README product gallery: `docs/assets/gallery/`
* Full visual deck exports: `docs/assets/presentation/trustlens-slide-01.png` through `trustlens-slide-08.png`

## Slide 1: Title

Visual: TrustLens banner, dashboard hero, or public demo URL.

Title: `TRUSTLENS`

Subtitle: Multi-agent AI Security Concierge

Footer note: `v1.0.5 | github.com/git-clowie/trustlens-agent | pixek.xyz/trustlens`

Speaker notes:

> TrustLens protects users in the critical seconds before they click a suspicious message. It does not just score a threat; it explains the evidence and gives the next safe action.

## Slide 2: Problem

Visual: phishing SMS/email/chat examples plus user panic questions.

Points:

* Traditional scanners give a score but little recovery guidance.
* Users need prevention, inspection, or recovery steps depending on what already happened.
* Screenshots, QR prompts, and short mobile messages are hard for normal users to evaluate quickly.

## Slide 3: Product Demo

Visual: dashboard Omnibox and sample buttons.

Points:

* Paste suspicious text or load a safe synthetic screenshot fixture.
* Select context: not clicked, clicked link, or data shared.
* Watch the agent timeline run OCR, PII redaction, link extraction, domain inspection, scoring, Gemma analysis, and reporting.

## Slide 4: Evidence And Action

Visual: Evidence Analytics, Score Trace, and compact Case Packet.

Points:

* Evidence Analytics summarizes links, domain risk, social hooks, AI analyst status, confidence, and trace depth.
* Score Trace shows structured score contributions.
* Case Packet gives a compact reporting snapshot with first safe move, top contributors, copy summary, JSON export, and print/PDF output.

## Slide 5: Architecture

Visual: pipeline diagram: Ingest -> Sanitize -> Inspect -> Score -> Plan -> Report.

Points:

* Google ADK-style coordinator agent.
* FastAPI backend and React/Vite frontend.
* Gemini Vision OCR for screenshots when configured.
* OpenRouter Gemma 4 31B analyst enrichment when configured.
* Deterministic fallback mode for repeatable demos.
* Static public demo bundle with hidden provider settings and server-side provider keys.

## Slide 6: Capstone Alignment

Visual: checklist grid.

Points:

* ADK agent and Python tool pipeline.
* MCP stdin/stdout server plus `scripts/mcp_demo.py`.
* Privacy guardrails with local PII redaction.
* CLI scanner and browser extension companion.
* Built `web/dist` demo bundle, Provider Settings, runtime static-hosting config, optional Docker helper, and docs.
* Public-demo release package and subpath-safe static hosting.

## Slide 7: Close

Visual: GitHub repository, dashboard, and runtime badges.

Points:

* Run locally: `python backend/run.py`.
* Public demo: `https://pixek.xyz/trustlens/`.
* Demo extras: `extension/`, `fixtures/`, `scripts/mcp_demo.py`.
* Repository: `github.com/git-clowie/trustlens-agent`.

Speaker notes:

> TrustLens bridges the gap between threat analysis and human action: private by design, explainable by default, and practical enough for real-world phishing recovery.
