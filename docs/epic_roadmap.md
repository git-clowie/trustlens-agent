# TrustLens Epic Roadmap

This is the next-step roadmap for turning TrustLens from a strong capstone into a standout security product demo.

## Highest-Impact Upgrades

1. **Browser Extension Companion** *(implemented in demo build)*
   - Added a Chrome extension that sends selected SMS/email/web text to the local TrustLens API.
   - This makes the "critical seconds before clicking" story feel real.

2. **Explainable Risk Evidence** *(implemented in demo build)*
   - Evidence Analytics now shows link count, maximum domain risk, social hooks, agent trace depth, AI analyst status, confidence, and structured score trace contributions.
   - The Gemma Analyst panel adds evidence notes and clarifying questions, with a marked deterministic fallback.

3. **Local Case History** *(implemented in demo build)*
   - Stores anonymized past investigations in local browser storage.
   - Lets users reopen recent cases and compare repeated campaigns, sender patterns, and domains.

4. **Real Screenshot Fixtures** *(implemented in demo build)*
   - Replaced mock-only screenshot markers with realistic local SVG SMS/email/QR screenshots.
   - Keep them local and safe, but visually persuasive for demo recording.

5. **MCP Client Demo** *(implemented in demo build)*
   - Added a short terminal script that sends MCP JSON-RPC requests and prints tool responses.
   - This proves the MCP layer without requiring Claude Desktop or Cursor setup during the demo.

## Technical Credibility Boosts

1. **Package & Verify**
   - Keep `pyproject.toml`, CLI entry points, and `python -m unittest discover -s tests`.
   - Include test output in the presentation or README.

2. **Threat Fixtures** *(implemented in demo build)*
   - Added a `fixtures/` folder with safe synthetic examples for courier, bank, lottery, romance, and QR phishing.
   - Use these fixtures for unit tests, CLI demos, and UI samples.

3. **Scoring Trace Contract** *(implemented in demo build)*
   - Return a structured score trace from `score_risk`, not just the final score.
   - The UI renders the highest domain contribution, text persuasion hooks, and synthesis escalation as auditable score cards.

4. **Exportable Case Packet** *(implemented in demo build)*
   - The web UI can copy the compact incident snapshot, copy a short share summary, export the full JSON case packet, and print the packet to PDF.

5. **Deployment Story** *(implemented in demo build)*
   - Dockerfile and `.dockerignore` are included for optional containerized local hosting.
   - Primary demo handoff remains the built `web/dist` bundle served by the FastAPI app.
   - Static hosting can point to a separate backend by editing `web/dist/config.js` after build.
   - Provider Settings can override the hosted API base URL from the browser during a static demo.

6. **Judge Demo Mode** *(implemented in demo build)*
   - Adds a guided sample sequence for the strongest recording path.
   - Offline Demo Mode routes AI enrichment through deterministic fallback for stable judging.

## Presentation Angle

The strongest framing is:

> "TrustLens is not a link checker. It is a context-aware recovery agent that translates suspicious-message evidence into human-safe next steps."

That makes it feel more original than another phishing classifier.
