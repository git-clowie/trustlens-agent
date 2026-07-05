import json
import os
import time
import urllib.error
import urllib.request

DEFAULT_OPENROUTER_MODEL = "google/gemma-4-31b-it:free"
OPENROUTER_MODEL_FALLBACKS = (
    DEFAULT_OPENROUTER_MODEL,
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-3-27b-it",
)
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are TrustLens Gemma 4 Analyst, a phishing safety analyst.
Use only the supplied redacted evidence and structured signals.
Do not ask the user to open links, validate credentials, call suspicious senders, or paste secrets.
Return JSON only with these keys:
executive_summary, user_explanation, recommended_priority, evidence, questions, next_actions, confidence_note.
recommended_priority must be one of: monitor, caution, urgent, lockdown.
evidence must be an array of objects with signal, why_it_matters, and severity.
questions and next_actions must be short arrays with at most 3 items each.
Be calm, specific, and practical."""


def _unique_models(primary_model: str) -> list:
    models = [primary_model, *OPENROUTER_MODEL_FALLBACKS]
    return [model for index, model in enumerate(models) if model and model not in models[:index]]


def _priority_from_verdict(verdict: str, situation: str) -> str:
    if situation == "compromised":
        return "lockdown"
    if verdict == "High":
        return "urgent"
    if verdict == "Medium":
        return "caution"
    return "monitor"


def _as_string_list(value, limit=3) -> list:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()][:limit]
    if isinstance(value, str) and value.strip():
        return [value.strip()][:limit]
    return []


def _safe_json_loads(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start:end + 1])
        raise


def _normalize_evidence(items, verdict: str) -> list:
    if not isinstance(items, list):
        return []

    normalized = []
    for item in items[:5]:
        if isinstance(item, dict):
            signal = str(item.get("signal", "")).strip()
            why = str(item.get("why_it_matters", "")).strip()
            severity = str(item.get("severity", verdict.lower())).strip().lower()
        else:
            signal = str(item).strip()
            why = "This signal contributed to the risk estimate."
            severity = verdict.lower()

        if signal:
            normalized.append({
                "signal": signal,
                "why_it_matters": why or "This signal contributed to the risk estimate.",
                "severity": severity if severity in {"low", "medium", "high"} else verdict.lower(),
            })
    return normalized


def _build_prompt_payload(
    redacted_text: str,
    situation: str,
    summary: dict,
    domain_reports: list,
    social_engineering_indicators: list,
    safe_steps: list,
) -> dict:
    return {
        "redacted_message": redacted_text[:3000],
        "user_situation": situation,
        "risk_summary": {
            "verdict": summary.get("verdict"),
            "risk_score": summary.get("risk_score"),
            "confidence": summary.get("confidence"),
            "breakdown": summary.get("breakdown", []),
        },
        "domain_reports": domain_reports,
        "social_engineering_indicators": social_engineering_indicators,
        "current_safe_steps": safe_steps,
        "privacy_note": "The message was PII-redacted locally before this model prompt.",
    }


def _offline_analysis(
    reason: str,
    situation: str,
    summary: dict,
    domain_reports: list,
    social_engineering_indicators: list,
    safe_steps: list,
) -> dict:
    verdict = summary.get("verdict", "Low")
    risk_score = summary.get("risk_score", 0)
    priority = _priority_from_verdict(verdict, situation)
    breakdown = summary.get("breakdown", [])

    evidence = [
        {
            "signal": item,
            "why_it_matters": "This rule-based signal contributed to the TrustLens risk score.",
            "severity": verdict.lower(),
        }
        for item in breakdown[:5]
    ]

    if not evidence and domain_reports:
        evidence.append({
            "signal": "Domain structure was inspected offline.",
            "why_it_matters": "Suspicious layouts can indicate brand impersonation or phishing infrastructure.",
            "severity": verdict.lower(),
        })
    if not evidence and social_engineering_indicators:
        evidence.append({
            "signal": "Social engineering language was detected.",
            "why_it_matters": "Pressure tactics are commonly used to rush unsafe decisions.",
            "severity": verdict.lower(),
        })

    questions_by_situation = {
        "before_click": [
            "Did the message arrive from a sender you already trust?",
            "Do you have a separate official app or portal to verify the request?",
        ],
        "clicked_only": [
            "Did the page ask for login, payment, or download permission?",
            "Did any file download automatically after you opened the link?",
        ],
        "compromised": [
            "Which account, card, or identity detail did you enter?",
            "Have you reused that password on email, banking, or social accounts?",
        ],
    }

    return {
        "provider": "offline_rules",
        "model": "deterministic-security-fallback",
        "fallback_used": True,
        "status": "fallback",
        "fallback_reason": reason,
        "executive_summary": f"TrustLens classified this as {verdict} risk ({risk_score}/100) using local rules.",
        "user_explanation": "Gemma 4 enrichment is unavailable, so this explanation is generated from deterministic TrustLens evidence.",
        "recommended_priority": priority,
        "evidence": evidence,
        "questions": questions_by_situation.get(situation, [])[:3],
        "next_actions": [step.replace("**", "") for step in safe_steps[:3]],
        "confidence_note": "Model fallback used; review the local risk evidence and official channels before taking action.",
    }


def _format_openrouter_error(error: Exception) -> str:
    if isinstance(error, urllib.error.HTTPError):
        detail = error.read().decode("utf-8", errors="replace")[:240]
        return f"{error.code}: {detail}"
    if isinstance(error, urllib.error.URLError):
        return str(error.reason)
    return str(error)


def generate_gemma_analysis(
    redacted_text: str,
    situation: str,
    summary: dict,
    domain_reports: list,
    social_engineering_indicators: list,
    safe_steps: list,
) -> dict:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    primary_model = os.getenv("OPENROUTER_MODEL", DEFAULT_OPENROUTER_MODEL).strip()

    if not api_key:
        return _offline_analysis(
            "OPENROUTER_API_KEY is not configured.",
            situation,
            summary,
            domain_reports,
            social_engineering_indicators,
            safe_steps,
        )

    payload = _build_prompt_payload(
        redacted_text,
        situation,
        summary,
        domain_reports,
        social_engineering_indicators,
        safe_steps,
    )
    failures = []

    for model in _unique_models(primary_model):
        body = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            "temperature": 0.1,
            "max_tokens": 900,
            "response_format": {"type": "json_object"},
        }

        encoded_body = json.dumps(body).encode("utf-8")
        request = urllib.request.Request(
            OPENROUTER_ENDPOINT,
            data=encoded_body,
            method="POST",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv(
                    "OPENROUTER_HTTP_REFERER",
                    "https://github.com/git-clowie/trustlens-agent",
                ),
                "X-Title": os.getenv("OPENROUTER_APP_TITLE", "TrustLens Agent"),
            },
        )

        for attempt in range(2):
            try:
                with urllib.request.urlopen(request, timeout=25) as response:
                    data = json.loads(response.read().decode("utf-8"))
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                parsed = _safe_json_loads(content)

                verdict = summary.get("verdict", "Low")
                return {
                    "provider": "openrouter",
                    "model": data.get("model", model),
                    "fallback_used": False,
                    "status": "live",
                    "request_id": data.get("id"),
                    "usage": data.get("usage"),
                    "executive_summary": str(parsed.get("executive_summary", "")).strip(),
                    "user_explanation": str(parsed.get("user_explanation", "")).strip(),
                    "recommended_priority": str(
                        parsed.get("recommended_priority", _priority_from_verdict(verdict, situation))
                    ).strip(),
                    "evidence": _normalize_evidence(parsed.get("evidence"), verdict),
                    "questions": _as_string_list(parsed.get("questions")),
                    "next_actions": _as_string_list(parsed.get("next_actions")),
                    "confidence_note": str(parsed.get("confidence_note", "")).strip(),
                }
            except Exception as exc:
                failure = _format_openrouter_error(exc)
                if "429" in failure and attempt == 0:
                    time.sleep(0.8)
                    continue
                failures.append(f"{model} -> {failure}")
                break

    return _offline_analysis(
        "OpenRouter Gemma routing failed. " + " | ".join(failures[:3]),
        situation,
        summary,
        domain_reports,
        social_engineering_indicators,
        safe_steps,
    )
