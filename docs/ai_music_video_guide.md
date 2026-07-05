# TrustLens AI Music Video Production Plan

Combine **Suno AI** (for the track) and **Luma Dream Machine / Runway Gen-3 / Pika** (for the video scenes) to build a fully AI-generated submission.

---

## 🎵 Part 1: Suno AI Lyrics & Style Config
*   **Prompt for Suno Style:** `Obsidian dark cyberpunk synthwave, driving beat, electronic security theme, high-energy vocals, male and female duets, 110 BPM`
*   **Suno Lyrics (Copy & Paste):**
    ```text
    [Verse 1]
    You get a message in the middle of the night
    A package warning or a bank account fight
    "Click the link to verify your code right now"
    Before you tap the screen, you gotta wonder how.
    But hold up! Don't let the panic take control
    Anonymize the numbers, keep your privacy whole.

    [Chorus]
    This is TrustLens (Lens)
    Scanning every threat on the screen
    Through the multi-agent ADK pipeline, so clean
    Yeah, TrustLens (Lens)
    Zero-trust checking the zone
    Off-line investigation on your mobile phone
    Don't click, inspect, recover the name
    TrustLens is changing the game!

    [Verse 2]
    Gemini Vision OCR reads the screenshot view
    Redacting all the cards, protecting me and you
    Domain typosquats (netfl1x) checked entirely offline
    MCP server routing tools, feeling so divine.
    No live requests, no trackers, zero-threat line
    Safe recommendations, exactly in time.

    [Chorus]
    This is TrustLens (Lens)
    Scanning every threat on the screen
    Through the multi-agent ADK pipeline, so clean
    Yeah, TrustLens (Lens)
    Zero-trust checking the zone
    Off-line investigation on your mobile phone
    Don't click, inspect, recover the name
    TrustLens is changing the game!

    [Outro]
    (Built by pixek.xyz)
    Secure before you click...
    TrustLens.
    ```

---

## 🎬 Part 2: Video Prompts for AI Video Generators (Luma / Runway)
Use these prompts and feed the generated assets to compile your video clip matching the Suno track.

### Scene 1: Intro (Verse 1)
*   **Visual Asset Reference:** [banner.jpg](file:///e:/Antigravity/Kaggle%20Capstone/docs/assets/banner.jpg)
*   **Video Prompt:**
    > "A futuristic cyberpunk smartphone floating in a dark room. The screen displays a glowing phishing alert with bright red warnings. Neon purple and cyan light refracts off the screen. Cinematic, 4k resolution, high-tech, slow zoom."

### Scene 2: PII Redaction (Verse 1 End / Chorus)
*   **Visual Asset Reference:** [pii_redaction.jpg](file:///e:/Antigravity/Kaggle%20Capstone/docs/assets/pii_redaction.jpg)
*   **Video Prompt:**
    > "A digital stream of characters, phone numbers, and emails on a dark grid backdrop. A glowing cyan beam sweeps across, dissolving the numbers into blank digital shield blocks. Safe data encryption flow, 3D holographic rendering, smooth motion."

### Scene 3: Offline Domain Check (Verse 2)
*   **Visual Asset Reference:** [domain_check.jpg](file:///e:/Antigravity/Kaggle%20Capstone/docs/assets/domain_check.jpg)
*   **Video Prompt:**
    > "A cyber intelligence interface analyzing a web address. The URL string breaks into glowing blocks labeled 'TLD', 'Subdomain', and 'Keywords'. Green holographic nodes light up as safe, and impostor keywords get highlighted in pulsing red danger glows."

### Scene 4: MCP Tool Integration (Chorus 2 / Outro)
*   **Visual Asset Reference:** [mcp_concept.jpg](file:///e:/Antigravity/Kaggle%20Capstone/docs/assets/mcp_concept.jpg)
*   **Video Prompt:**
    > "A dynamic network of multiple AI agents shown as glowing digital orbs, connecting via high-speed purple light pipelines to a central secure database. Data nodes pulsing, cybernetic grid lines, tech innovation concept, abstract digital network."

---

## 🎞️ Part 3: Video Assembly Instructions
1. Generate the track on **Suno AI** using the style and lyrics prompts.
2. Generate 4 to 5 short clips (5-seconds each) on **Luma Dream Machine** or **Runway Gen-3** using the video prompts above. Optionally, use the generated images in `docs/assets/` as "Image-to-Video" source context to make the videos match the app style.
3. Combine the audio track and video clips in any editor (like CapCut, Canva, or Premiere), overlay the lyrics on screen, and submit the final MP4.
