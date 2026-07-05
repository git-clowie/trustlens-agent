# Capstone Project Submission: TrustLens Agent

## 🛡️ Project Overview & Problem Statement

Phishing attacks and social engineering scams account for a significant portion of security breaches. Every day, millions of people receive suspicious text messages, package fee notifications, bank alerts, or unsolicited links. 

The traditional defense is a basic **phishing score scanner** (e.g. "This link is 80% dangerous"). However, a simple number does not solve the user's primary dilemma:
*   *What do I do now?*
*   *I already clicked it, am I infected?*
*   *I filled in my credit card details, how do I block it?*
*   *How do I explain this situation to my family or authorities?*

**TrustLens Agent** changes this. It is an **AI Security Concierge** that acts as an investigator and advisor. Instead of just scoring threat risk, it runs a multi-step investigation trace (PII cleaning, domain structure layout checks, social engineering keyword scanning), assesses risk levels, and generates a **customized, context-aware safety plan** based on the user's current situation (before click, clicked link, or credentials compromised). Finally, it drafts an incident report suitable for authorities.

---

## 🏛️ Multi-Agent Architecture & Design

The agent is designed using a code-first, tool-enabled orchestrator leveraging Google's **Agent Development Kit (ADK)**:

1.  **TrustLensCoordinatorAgent (Root)**: Coordinates the flow, invokes tools sequentially, aggregates findings, and applies final safety guardrails to ensure no PII leaks.
2.  **Privacy Guardrail (redact_pii)**: An offline regular-expression matching filter that masks sensitive info (SSNs, cards, phone numbers, emails) before models or external tools parse the message text.
3.  **Link Parser (extract_links)**: Extracts domains safely, applying a zero-trust model (it never connects to or visits the links to prevent drive-by downloads or IP exposure).
4.  **Domain Checker (inspect_domain_pattern)**: Performs heuristic audits on domains, checking for typosquatting (e.g. netfl1x), subdomains imitating brands (e.g. dhl.shipping-portal.xyz), and suspicious TLDs (.xyz, .cc, .top).
5.  **Heuristics Assessor (detect_social_engineering)**: Analyzes urgency, pressure tactics, brand impersonations, and financial triggers in text.
6.  **Safety Planner (generate_safe_steps)**: Maps risk verdict + user context to concrete, prioritized action plans.
7.  **Incident Reporter (generate_report_draft)**: Synthesizes threat signals into a standard incident draft.

---

## 🔌 Core Concepts Demonstrated

We have successfully integrated 5 core concepts from the course curriculum:

*   **Google ADK (Agent Development Kit)**: Built utilizing the official `google-adk` framework, declaring a coordinator LLM agent equipped with Python function tools.
*   **Model Context Protocol (MCP)**: Developed an MCP server in `mcp_server.py` supporting both standard JSON-RPC 2.0 stdin/stdout (used by AI editors like Cursor) and `FastMCP`.
*   **Security & Guardrails**: Integrated local PII redaction and zero-trust domain inspection to protect user privacy.
*   **Deployability**: Created a portable bundle consisting of a React/TypeScript frontend and FastAPI backend, deployable locally or inside a Docker container.
*   **Agent Skills & CLI**: Implemented `cli.py` to allow terminal users to query threats using `--sample` profiles or `--text` inputs.

---

## 🎨 The Vibe Coding Journey

Building TrustLens was a testament to the "Vibe Coding" methodology:
1.  **Planning**: Using natural language prompts, we structured the agent's behavior around user-state situations rather than simple database matching.
2.  **Iterating on UX**: We designed a dashboard showing a live "Agent Run Timeline". This displays how the agent calls tools step-by-step (e.g., Anonymizing text → Checking domain → Synthesizing risk). This visual audit trail builds trust.
3.  **Refining**: When TypeScript compilation warnings occurred, we utilized agentic tools to inspect files, edit interfaces, and compile Vite assets.

---

## 🔍 Verification & Demonstration

### Sample Run Case: DHL Customs Scam SMS
*   **Input Message**: *"Stimate client DHL, pachetul dvs. are o taxa vamala restanta de 14.99 RON. Va rugam sa platiti imediat pe http://dhl.customs-fee-handling.xyz/portal pentru a evita returnarea."*
*   **User State**: *Before clicking*
*   **Agent Trace Output**:
    1.  `[PII Redaction]` Completed. Sensitive data masked.
    2.  `[Link Extraction]` Extracted domain: `dhl.customs-fee-handling.xyz`
    3.  `[Domain Inspection]` Flagged. High-risk layout impersonating DHL.
    4.  `[Threat Intelligence Check]` Detected urgency ("imediat") and financial requests.
    5.  `[Risk Synthesis]` Computed Verdict: **HIGH RISK** (Risk Score: 95/100).
    6.  `[Safety Planner]` Output:
        *   Do not click link.
        *   Do not reply to sender.
        *   Verify independently via DHL official app.
        *   Block number and delete.

If the user changes their state to **"I already shared my card details"**, the Safety Planner adapts instantly, outputting:
*   Contact your bank immediately via the number on the back of your card to freeze accounts.
*   Change passwords and enable 2FA on related services.
*   Monitor statements for unauthorized transactions.
