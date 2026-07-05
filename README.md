<div align="center">
  <img src="./docs/assets/banner.jpg" alt="TrustLens Banner" width="100%" style="border-radius: 12px;" />
</div>

# TrustLens Agent (AI Security Concierge)

**TrustLens** is a security-first, ADK-powered AI investigation agent designed to check suspicious messages (SMS, Email, Chat, DMs) and screenshots in the critical seconds before a user clicks. It features a **Premium Dark Hi-Tech UI**, multimodal Vision OCR, anonymizes sensitive data, heuristically analyzes domain threat indicators, detects psychological social engineering tricks, calculates a consolidated threat score, and generates a personalized, situation-aware action plan.

## 🌟 Key Features

1. **Multimodal Vision OCR**: Users can upload screenshots of suspicious messages. The app extracts and analyzes text using Gemini Vision before passing it to the security pipeline.
2. **OpenRouter Gemma 4 Analyst**: Optional hosted Gemma enrichment adds a human-readable security explanation, evidence notes, clarifying questions, and action priority. If unavailable, TrustLens uses a marked deterministic fallback.
3. **Premium Cyberpunk UI**: A crafted React frontend with a unified Omnibox, frosted cyber-glass panels, and auto-scanning capabilities.
4. **Privacy-First Guardrail (PII Redaction)**: Anonymizes credit cards, phone numbers, emails, and SSNs/CNPs before forwarding inputs to AI models.
5. **Offline Domain Inspection**: Parses domain layout patterns for typosquatting, brand impersonation (e.g. netfl1x, paypa1), subdomains, and high-risk TLDs (.xyz, .cc, .top) without requesting live assets.
6. **Social Engineering Detection**: Evaluates message indicators for artificial urgency, financial fees, and credential harvesting hooks.
7. **Context-Aware Safety Planner**: Curates dynamic recovery guides tailored to user states (e.g., "Prevention Mode", "Inspection Mode", "Recovery Mode").
8. **Incident Reporter**: Generates a pre-formatted incident draft ready to copy and send to anti-phishing organizations (APWG, CERT, domain registrars).
9. **Multi-Interface Deployment**: Run it via the React Web Dashboard, a local Python CLI tool, or expose tools to external AI clients via the Model Context Protocol (MCP) Server.

---

## 🛠️ System Architecture

```
                       [ USER INPUT ]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Premium Web UI ]                   [ CLI Interface ]
            │                                 │
     (FastAPI Backend)                        │
            │                                 │
            ▼                                 ▼
    ┌────────────────────────────────────────────────────────┐
    │          TrustLensCoordinatorAgent (ADK)               │
    ├────────────────────────────────────────────────────────┤
    │  Executes pipeline steps:                              │
    │  1. redact_pii()                  [Privacy Guardrail]  │
    │  2. extract_links()               [Link Parsing]       │
    │  3. inspect_domain_pattern()      [Spoof Detection]    │
    │  4. detect_social_engineering()   [Keyword Check]      │
    │  5. score_risk()                  [Synthesis]          │
    │  6. generate_safe_steps()         [Safety Planner]     │
    │  7. generate_report_draft()       [Incident Draft]     │
    │  8. Output Safety Review          [Verification]       │
    └────────────────────────────────────────────────────────┘
```

---

## 🚀 Setup & Installation

Ensure you have **Python 3.10+** and **Node.js 18+** installed.

### 1. Backend Setup
1. Clone or download the repository files.
2. Install the Python package and dependencies:
   ```bash
   python -m pip install -e .
   ```
   This enables both `python -m trustlens_agent...` commands and the `trustlens` / `trustlens-mcp` console shortcuts.
3. Copy `.env.example` to `.env` and insert the keys you want to use. Both are optional; TrustLens clearly marks fallback mode when a provider is not configured:
   ```bash
   GEMINI_API_KEY=your_gemini_key_for_screenshot_ocr
   OPENROUTER_API_KEY=your_openrouter_key_for_gemma_analysis
   OPENROUTER_MODEL=google/gemma-4-31b-it:free
   ```
4. Start the FastAPI backend server:
   ```bash
   python backend/run.py
   ```
The backend will start on **`http://127.0.0.1:8000`** and serve the static web files.

### AI Runtime Options

TrustLens keeps AI provider keys server-side:

| Capability | Provider | Env var | Fallback |
| :--- | :--- | :--- | :--- |
| Screenshot OCR | Gemini 2.5 Flash | `GEMINI_API_KEY` | Mock OCR text for demo samples |
| Analyst enrichment | OpenRouter Gemma 4 | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | Deterministic TrustLens evidence summary |

The React demo never needs direct access to provider keys. It only calls the FastAPI backend and displays whether Gemini/OpenRouter are live or running in fallback mode.

### 2. Frontend Development Setup (Optional)
The pre-compiled frontend assets are already packaged inside `web/dist` and served by FastAPI. If you want to make live edits:
1. Navigate to the `web` folder:
   ```bash
   cd web
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the Vite React dev server:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173`** in your browser. It will connect to the backend running at port 8000.

---

## 💻 Running the Local CLI Scanner

You can run the agent locally inside your terminal to scan a mock message payload:
```bash
trustlens scan --sample courier
```

Equivalent module form:
```bash
python -m trustlens_agent.cli scan --sample courier
```

Other available sample flags:
*   `--sample courier` (Impersonating shipping delivery invoice SMS)
*   `--sample bank` (Impersonating bank security verification request SMS)
*   `--sample lottery` (Impersonating prize claim email)
*   `--sample romance` (Impersonating romance scam transfer request)

To scan a custom message and specify context:
```bash
trustlens scan --text "URGENT: Click here to verify your account now http://secure-bt-portal.xyz" --situation clicked_only
```

---

## 🔌 Exposing Tools via MCP Server

TrustLens exports its threat analysis tools via the **Model Context Protocol (MCP)**. This lets you attach the same agent security functions to MCP-compatible AI clients (such as Claude Desktop or Cursor).

Start the MCP Server on stdin/stdout:
```bash
trustlens-mcp
```

Equivalent module form:
```bash
python -m trustlens_agent.mcp_server
```

To configure with Claude Desktop, add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "trustlens-security": {
      "command": "python",
      "args": ["-m", "trustlens_agent.mcp_server"],
      "env": {
        "GEMINI_API_KEY": "your_api_key"
      }
    }
  }
}
```

---

## 🎓 Capstone Rubric Alignment

| Capstone Requirement | TrustLens Implementation |
| :--- | :--- |
| **1. ADK Agent & Tools** | Core logic runs within the `TrustLensCoordinatorAgent` using the official `google-adk` framework to register and orchestrate Python FunctionTools (`tools.py`). |
| **2. MCP Server Integration** | Exposes tool APIs (PII cleaner, domain inspector, keyword checks) over JSON-RPC 2.0 stdin/stdout in `mcp_server.py`, fully compliant with the Model Context Protocol. |
| **3. Security & Safety features** | Strictly isolates domain checks without fetching remote assets (zero-trust), sanitizes user PII locally via custom regex pipelines, and ensures no credential inputs. |
| **4. Deployability** | Self-contained React/FastAPI bundle with Docker-ready specifications and single-port deployment config. |
| **5. Agent Skill / CLI** | Implemented a visual command-line scanning system (`cli.py`) simulating threat profiles and matching safety actions. |

---

## Verification

Run the focused project checks before recording or submitting:
```bash
python -m unittest discover -s tests
python -m compileall src backend
cd web && npm run lint && npm run build
```

For presentation planning, see:
* `docs/video_script.md`
* `docs/presentation_deck.md`
* `docs/epic_roadmap.md`
