# TrustLens Epic Roadmap

This is the next-step roadmap for turning TrustLens from a strong capstone into a standout security product demo.

## Highest-Impact Upgrades

1. **Browser Extension Companion**
   - Add a Chrome extension that sends selected SMS/email/web text to the local TrustLens API.
   - This makes the "critical seconds before clicking" story feel real.

2. **Explainable Risk Evidence**
   - Add an evidence panel that maps each score contribution to the exact domain/text signal.
   - Example: `+30 suspicious TLD`, `+40 DHL brand in non-official domain`, `+20 urgency pressure`.

3. **Local Case History**
   - Store anonymized past investigations in local browser storage.
   - Let users compare repeated campaigns, sender patterns, and domains.

4. **Real Screenshot Fixtures**
   - Replace mock base64 screenshot markers with realistic generated SMS/email screenshots.
   - Keep them local and safe, but visually persuasive for demo recording.

5. **MCP Client Demo**
   - Add a short terminal script that sends MCP JSON-RPC requests and prints tool responses.
   - This proves the MCP layer without requiring Claude Desktop or Cursor setup during the demo.

## Technical Credibility Boosts

1. **Package & Verify**
   - Keep `pyproject.toml`, CLI entry points, and `python -m unittest discover -s tests`.
   - Include test output in the presentation or README.

2. **Threat Fixtures**
   - Add a `fixtures/` folder with safe synthetic examples for courier, bank, lottery, romance, and QR phishing.
   - Use these fixtures for unit tests, CLI demos, and UI samples.

3. **Scoring Trace Contract**
   - Return a structured score trace from `score_risk`, not just the final score.
   - The UI can render it as a transparent "why this score happened" audit trail.

4. **Deployment Story**
   - Add a one-command Docker demo: `docker build -t trustlens .` then `docker run -p 8000:8000 trustlens`.
   - Include screenshots of the app running from the container.

## Presentation Angle

The strongest framing is:

> "TrustLens is not a link checker. It is a context-aware recovery agent that translates suspicious-message evidence into human-safe next steps."

That makes it feel more original than another phishing classifier.

