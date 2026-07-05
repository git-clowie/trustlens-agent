# TrustLens Video Demo Script & Guide

A step-by-step production plan and voiceover script to record a professional 2-to-3 minute video demonstration of TrustLens for your Capstone submission.

---

## 🛠️ Recommended Recording Setup
*   **Recording Tool:** Use [Loom](https://www.loom.com/) (free and easy) or [OBS Studio](https://obsproject.com/) (high quality).
*   **Audio:** Use a headset or dedicated microphone in a quiet room.
*   **Resolution:** Record in full screen (1080p recommended).

---

## 🎬 Video Scene-by-Scene Script

### Scene 1: Introduction (0:00 - 0:25)
*   **Visual on screen:** Open the browser on `http://127.0.0.1:8000`. Show the premium dark landing page with the glowing TrustLens title, MCP Ready badge, and the unified Omnibox.
*   **Action:** Hover your cursor over the "App Info" button to show the professional modal, then close it.
*   **Voiceover (Read this):**
    > "Hello, my name is [Your Name], and this is TrustLens: an AI Security Concierge built on Google's Agentic Development Kit and the Model Context Protocol. TrustLens protects users in the critical seconds before they click a malicious link. Let's look at how it works."

---

### Scene 2: Text Verification Demo & Auto-Scan (0:25 - 1:00)
*   **Visual on screen:** Click the **"DHL SMS"** quick sample button. Watch the console automatically fill, trigger the investigation timeline, and run the real-time agent trace animation.
*   **Action:** Scroll down slowly to show the threat score (95/100), the PII redacted preview, the detected indicators, and the action plan.
*   **Voiceover (Read this):**
    > "With our one-click auto-scan, a user simply selects or pastes a message. Here, the agent triggers a multi-step investigation pipeline. It runs local PII redaction, performs zero-trust offline domain pattern matching, and rates the threat. In this case, we have a high-risk score of 95 out of 100 because of impersonated DHL branding and artificial urgency."

---

### Scene 3: Multimodal Vision OCR Demo (1:00 - 1:40)
*   **Visual on screen:** Scroll back up. Press "Analyze Another Message". Click the **"📷 Bank Screen"** or **"📷 Courier Screen"** sample button.
*   **Action:** Watch the timeline start with the "Multimodal Vision OCR" step, decoding the simulated base64 screenshot, and running the analysis.
*   **Voiceover (Read this):**
    > "TrustLens is fully multimodal. If a user receives a suspicious image instead of text, they can drag-and-drop or upload a screenshot. Our backend routes this to Gemini Vision OCR, transcribes the message text automatically, and feeds it directly into the threat assessment pipeline—resulting in a clear threat rating and risk breakdown."

---

### Scene 4: Situation-Aware Planning (1:40 - 2:15)
*   **Visual on screen:** Scroll down to the **"Contextual Action Plan"** section. Point out the "Customized for: Prevention Mode" text.
*   **Action:** Explain how the advice differs if the user selected "Clicked Link" or "Data Shared" (Recovery mode) on the home screen.
*   **Voiceover (Read this):**
    > "The core differentiator of TrustLens is the Contextual Action Plan. Instead of just showing a scary score, it provides a step-by-step recovery guide customized to what the user did. If they haven't clicked, it tells them to delete it. If they shared credentials, it immediately tells them to freeze their bank cards, change passwords, and generates an official pre-formatted incident report ready to send to registrars or authorities."

---

### Scene 5: MCP & Technical Architecture (2:15 - 2:45)
*   **Visual on screen:** Bring up your terminal showing `python -m trustlens_agent.cli scan --sample bank` or the code structure in your IDE.
*   **Action:** Show the `mcp_server.py` code briefly.
*   **Voiceover (Read this):**
    > "Under the hood, TrustLens is engineered with the Google Agentic Development Kit to orchestrate tools. It also exposes its security scanner as a Model Context Protocol (MCP) server. This lets developers mount TrustLens directly inside AI-powered coding environments like Cursor or Claude Desktop to inspect codebases and inputs dynamically."

---

### Scene 6: Outro (2:45 - 3:00)
*   **Visual on screen:** Go back to the premium dashboard web page.
*   **Voiceover (Read this):**
    > "TrustLens bridges the gap between threat intelligence and human action, keeping users safe in real time. Thank you for watching."
