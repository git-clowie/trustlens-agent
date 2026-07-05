# TrustLens Pitch Deck & Presentation Guide

This document contains a slide-by-slide outline, visual guidelines, and speaker notes designed to make your TrustLens capstone project presentation stand out. You can use this to build a PowerPoint, Google Slides, or Marp markdown presentation.

---

## Slide 1: Title Slide (The Hook)
*   **Visual Suggestion:** A dark background featuring the glowing cyan TrustLens shield banner we generated. Minimalist text, high-tech cyberpunk font.
*   **Slide Title:** `TRUSTLENS`
*   **Subtitle:** Your Multi-Agent AI Security Concierge
*   **Footer:** Built by pixek.xyz | Capstone Project Submission
*   **Speaker Notes:**
    > "Hello everyone. Today I'm excited to present TrustLens, a next-generation AI Security Concierge built to protect users in the critical seconds before they click a malicious link. Unlike traditional scanners, TrustLens doesn't just score threats—it guides users through the recovery process."

---

## Slide 2: The Problem (The Critical Security Gap)
*   **Visual Suggestion:** A split-screen slide. Left: Statistics showing the rise of phishing (SMS, Email, Chat). Right: Three common panic questions users ask.
*   **Bullet Points:**
    *   **The Problem:** Traditional scanners only give a score (e.g., *"This link is 80% dangerous"*).
    *   **The User Anxiety:**
        *   *"What do I do now?"* (Prevention)
        *   *"I already clicked, am I infected?"* (Inspection)
        *   *"I entered my bank details, how do I block it?"* (Recovery)
*   **Speaker Notes:**
    > "Phishing is a solved problem for servers, but not for humans. When a user receives a suspicious message, they face absolute panic. Traditional tools only give a score. They fail to answer the most important question: 'What do I do next?' Especially if they've already clicked or shared their data."

---

## Slide 3: The Solution (Introducing TrustLens)
*   **Visual Suggestion:** A screenshot of the unified Omnibox in the Premium Dark UI, emphasizing the "Select Status to Improve Accuracy" control.
*   **Bullet Points:**
    *   **Omnibox Interface:** Paste text or Drag & Drop screenshots (Multimodal Vision OCR).
    *   **Context-Aware Safety Planner:** Adapts its advice based on the user's situation.
    *   **Instant Visual Feedback:** Interactive agent workflow timeline showing tool execution in real-time.
*   **Speaker Notes:**
    > "TrustLens is a context-aware AI Security Concierge. It provides a simple unified interface where users can paste text or drop screenshots. It then runs a multi-agent pipeline and outputs a customized action plan tailored exactly to the user's situation: whether they are trying to prevent a click, inspect an active click, or recover from compromised credentials."

---

## Slide 4: Key Security Capabilities (How It Works)
*   **Visual Suggestion:** A simple horizontal pipeline diagram showing: **Ingest** ➔ **Sanitize** ➔ **Inspect** ➔ **Generate**.
*   **Bullet Points:**
    *   **Local PII Redaction:** Anonymizes credit cards, phone numbers, and SSNs locally *before* processing.
    *   **Zero-Trust Offline Inspection:** Safely parses domain structures for typosquatting (e.g., `netfl1x`) without making live network requests.
    *   **Social Engineering Analysis:** Scans for pressure tactics, urgency, and brand spoofing.
*   **Speaker Notes:**
    > "To achieve this safely, TrustLens implements strict privacy guardrails. First, a local PII Redaction tool masks sensitive details so that credit cards or phone numbers never leak to external LLMs. Second, it uses a Zero-Trust Domain Inspector that parses domain layouts entirely offline to prevent malicious servers from tracking the user's IP address."

---

## Slide 5: System Architecture & Technologies
*   **Visual Suggestion:** A diagram or table listing the Core Capstone Integrations.
*   **Bullet Points:**
    *   **Agent Framework:** Built using the **Google Agentic Development Kit (ADK)**.
    *   **Model Context Protocol (MCP):** Exposes analysis tools via an MCP Server.
    *   **Multimodal AI:** Powered by **Gemini Pro & Vision** for text and screenshot OCR.
    *   **Backend & Frontend:** FastAPI (Python) + React (TypeScript/Vite) wrapped in a Dockerized environment.
*   **Speaker Notes:**
    > "Technically, the project is structured as a code-first orchestrator built on the Google Agentic Development Kit. It wraps the entire security pipeline into modular tools. Furthermore, it implements the Model Context Protocol (MCP) server, allowing developers to plug TrustLens directly into AI-assisted developer IDEs like Cursor or Claude Desktop to secure code-generation environments."

---

## Slide 6: Alignment with Capstone Rubric
*   **Visual Suggestion:** A clean checklist grid showing 100% compliance.
*   **Table Content:**
    *   [x] **ADK Agent & Tools:** Orchestrated by `TrustLensCoordinatorAgent`.
    *   [x] **MCP Server:** Live stdin/stdout implementation for external clients.
    *   [x] **Security & Guardrails:** Local regex-based PII redaction and offline checks.
    *   [x] **CLI Tool:** Terminal scanner supporting threat profiles.
    *   [x] **Deployability:** Pre-compiled static assets served instantly via FastAPI.
*   **Speaker Notes:**
    > "TrustLens completely aligns with the Capstone requirements. It uses the Google ADK to organize agents, implements a fully functional Model Context Protocol server, features PII guardrails, includes a CLI scanning tool, and is packaged for easy deployment using a single-port FastAPI server or Docker."

---

## Slide 7: Conclusion & Demo
*   **Visual Suggestion:** The QR code or link to the GitHub repository, with logos of Google Gemini, ADK, and pixek.xyz.
*   **Bullet Points:**
    *   **Try it now:** Run `python backend/run.py`
    *   **Next Steps:** Integration into browser extensions and mobile notification gateways.
    *   **GitHub Repository:** `github.com/git-clowie/trustlens-agent`
*   **Speaker Notes:**
    > "Thank you for your time. TrustLens is fully open-source, easily deployable, and ready to protect users. I am now open to any questions, or we can jump into a live demonstration of the CLI and Dashboard."
