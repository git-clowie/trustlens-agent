# TrustLens Video Demo Script & Guide

A step-by-step production plan and voiceover script to record a professional 2-to-3 minute video demonstration of TrustLens for the Capstone submission.

---

## Recommended Recording Setup

* **Recording Tool:** Loom or OBS Studio.
* **Audio:** Use a headset or dedicated microphone in a quiet room.
* **Resolution:** Record in full screen at 1080p.

---

## Video Scene-by-Scene Script

### Scene 1: Introduction (0:00 - 0:25)

* **Visual on screen:** Open `http://127.0.0.1:8000`. Show the premium dark dashboard, clean header, unified Omnibox, and runtime badges in the footer.
* **Action:** Open the "App Info" modal briefly, then close it.
* **Voiceover:**
  > "Hello, my name is [Your Name], and this is TrustLens: an AI Security Concierge built on Google's Agent Development Kit and the Model Context Protocol. TrustLens protects users in the critical seconds before they click a malicious link."

---

### Scene 2: Text Verification Demo & Auto-Scan (0:25 - 1:05)

* **Visual on screen:** Click the "DHL SMS" quick sample button. Watch the timeline run through PII Redaction, Domain Inspection, Risk Synthesis, Safety Planner, and Gemma Analyst.
* **Action:** Scroll down slowly to show the risk score, Evidence Analytics, Score Trace, domain audit, Gemma Analyst panel, and contextual action plan.
* **Voiceover:**
  > "With one click, TrustLens triggers a multi-step investigation pipeline. It redacts personal data locally, inspects the destination domain without opening it, detects social engineering tactics, scores the risk, and enriches the result with a Gemma analyst layer through OpenRouter when configured. In this DHL sample, the score reaches 100 out of 100 because of brand impersonation, a suspicious top-level domain, and artificial urgency."

---

### Scene 3: Multimodal Vision OCR Demo (1:05 - 1:40)

* **Visual on screen:** Press "Analyze Another Message", then click "Bank Screen", "Courier Screen", "Prize Screen", or "QR Screen".
* **Action:** Show the "Multimodal Vision OCR" timeline step and the extracted text flowing into the same investigation dashboard.
* **Voiceover:**
  > "TrustLens is multimodal. If a user receives a suspicious screenshot instead of text, the backend routes it through Gemini Vision OCR, transcribes the message, and feeds the text into the same safe investigation pipeline. The bundled screenshots are safe synthetic fixtures, so the demo stays repeatable with or without Gemini configured."

---

### Scene 4: Situation-Aware Planning, Export, and History (1:40 - 2:20)

* **Visual on screen:** Show "Contextual Action Plan", then the compact Case Packet controls: Copy Report, Copy Summary, and Export JSON.
* **Action:** Return to the main screen and show Case History with the anonymized saved investigation.
* **Voiceover:**
  > "TrustLens does not stop at a scary score. The action plan changes based on what the user already did: not clicked, clicked, or shared data. The compact case packet gives a balanced snapshot for reporting, can copy a short share summary, exports a full JSON case packet, and reopens anonymized local history so repeated scams can be compared safely."

---

### Scene 5: Extension, MCP & Technical Architecture (2:20 - 2:50)

* **Visual on screen:** Show the `extension/` folder, then run `python scripts/mcp_demo.py` in a terminal.
* **Action:** Mention the same security tools are available from the web app, Chrome extension, CLI, and MCP server.
* **Voiceover:**
  > "Under the hood, TrustLens uses Google ADK to organize the agent pipeline and exposes its core security tools through an MCP server. The companion extension shows how this can protect selected text before a user clicks, while the MCP demo script proves the tool layer works without relying on a specific host client."

---

### Scene 6: Outro (2:50 - 3:00)

* **Visual on screen:** Return to the dashboard with footer badges showing ADK, MCP, Gemini OCR, and Gemma runtime state.
* **Voiceover:**
  > "TrustLens bridges the gap between threat analysis and human action: private by design, explainable by default, and ready for real-world phishing recovery."
