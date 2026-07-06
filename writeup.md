# Capstone Project Submission: TrustLens Agent

<div align="center">
  <img src="./docs/assets/banner.jpg" alt="TrustLens Banner" width="100%" style="border-radius: 12px;" />
</div>

## Project Overview

Phishing attacks and social engineering scams often hit users in the critical seconds before they click. Traditional scanners may say a message is risky, but they rarely answer the user's real question: what should I do now?

**TrustLens Agent** is an AI Security Concierge that inspects suspicious SMS, email, chat, DM, and screenshot threats. It redacts private data, checks links without visiting them, detects social engineering tactics, explains the risk score, and generates a situation-aware safety plan.

Current release: `v1.0.4`. The app can run locally through FastAPI or as a static public demo at `https://pixek.xyz/trustlens/`, with live Gemini/OpenRouter analysis enabled through a server-side backend or an explicitly public browser demo key.

TrustLens supports three user states:

* **Prevention:** the user has not clicked.
* **Inspection:** the user clicked a link but did not share data.
* **Recovery:** the user shared credentials, card data, or personal information.

## Architecture

TrustLens is built as a code-first agentic pipeline:

1. **TrustLensCoordinatorAgent:** orchestrates the investigation flow.
2. **PII Redaction:** masks emails, phones, cards, SSNs, and national ID-like values.
3. **Link Extraction:** parses URLs without opening them.
4. **Domain Inspection:** detects suspicious TLDs, brand impersonation, typosquatting, and risky layouts.
5. **Social Engineering Detection:** finds urgency, money pressure, brand claims, and credential prompts.
6. **Risk Synthesis:** returns verdict, confidence, breakdown, and structured `score_trace`.
7. **Safety Planner:** creates next steps based on the user's current state.
8. **Gemma Analyst:** optionally enriches the explanation through OpenRouter, with a marked local fallback.
9. **Case Packet:** generates a compact reporting snapshot with first safe move and anonymized content.

## Interfaces

TrustLens can be used from multiple surfaces:

* **React/FastAPI dashboard:** main capstone demo UI.
* **CLI:** `trustlens scan --sample courier`.
* **MCP server:** `trustlens-mcp` or `python -m trustlens_agent.mcp_server`.
* **MCP demo script:** `python scripts/mcp_demo.py`.
* **Chrome companion extension:** `extension/`, loaded unpacked, for selected webpage text.
* **Static web bundle:** `release/trustlens-web-dist.zip`, uploadable to root or subfolder hosting.

## Safety And Privacy

TrustLens is designed around safe handling:

* It does not click, fetch, or validate suspicious links.
* Provider keys stay server-side.
* PII redaction runs before external model enrichment.
* The UI clearly marks Gemini/OpenRouter live mode versus fallback mode.
* Local case history stores sanitized reports, not raw OCR text.
* Static hosting never exposes provider keys and can still run deterministic browser fallback samples.

## Demo Assets

The repo includes safe synthetic fixtures for repeatable demos:

* `fixtures/messages/`
* `fixtures/screenshot_manifest.json`
* `web/public/fixtures/screenshots/`

The screenshot buttons use deterministic OCR markers so the demo behaves consistently whether or not Gemini OCR is configured.

## Capstone Concepts Demonstrated

*   **Google ADK**: Orchestrates core tools and steps via `TrustLensCoordinatorAgent` using the official `google-adk` framework.
*   **Model Context Protocol (MCP)**: Implements standard JSON-RPC 2.0 stdin/stdout MCP server for external client integration.
*   **Multimodal AI Integration**: Employs Gemini Vision for OCR decoding of suspicious screenshot attachments.
*   **Hosted LLM Support**: Leverages OpenRouter API (Gemma model) with robust, tested local fallback capabilities.
*   **Security & Guardrails**: Enforces local offline regex-based PII masking and zero-network domain inspection patterns.
*   **Deployability**: Portably packages the frontend (`web/dist` bundle) served cleanly via the FastAPI backend, static subpath hosting, or optional Docker.
*   **UX Excellence**: Real-time explainable score traces, offline testing mock states, local storage case history, and secure admin controls.

## Verification

Recommended checks:

```bash
python -m unittest discover -s tests
python -m compileall -f src backend scripts
cd web && npm run lint && npm run build
python scripts/mcp_demo.py
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package_release.ps1
```

## Sample Scenario

Input:

```txt
DHL: your package has an outstanding customs fee. Pay now at http://dhl.customs-fee-handling.xyz/portal
```

Output:

* Verdict: High risk.
* Score Trace: suspicious domain risk, urgency pressure, financial request, and link-plus-pressure escalation.
* First safe move: do not click the link.
* Recovery plan: changes depending on whether the user clicked or shared data.

TrustLens is not a link checker. It is a context-aware recovery agent that translates suspicious-message evidence into human-safe next steps.
