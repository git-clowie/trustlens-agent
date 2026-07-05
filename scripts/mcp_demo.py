"""Small TrustLens MCP JSON-RPC demo.

Runs the local MCP server as a subprocess, sends a few standard JSON-RPC
requests, and prints compact evidence that the MCP tools work without needing
Claude Desktop, Cursor, or another host client.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
SAMPLE_TEXT = (
    "Banca Transilvania: cont blocat urgent. Confirmati cardul la "
    "https://bt-verificare-securizata.today/login sau accesul va fi suspendat."
)


def main() -> int:
    env = os.environ.copy()
    env["PYTHONPATH"] = f"{SRC}{os.pathsep}{env.get('PYTHONPATH', '')}"

    process = subprocess.Popen(
        [sys.executable, "-m", "trustlens_agent.mcp_server"],
        cwd=ROOT,
        env=env,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        initialize = rpc(process, "initialize", {})
        tools = rpc(process, "tools/list", {})["result"]["tools"]
        redacted = call_tool(process, "redact_pii", {"text": SAMPLE_TEXT})
        links = call_tool(process, "extract_links", {"text": SAMPLE_TEXT})
        domain_report = call_tool(process, "inspect_domain_pattern", {"domain": links[0]["domain"]})
        indicators = call_tool(process, "detect_social_engineering", {"text": redacted})
        summary = call_tool(
            process,
            "score_risk",
            {"domain_reports": [domain_report], "text_indicators": indicators},
        )
        safe_steps = call_tool(
            process,
            "generate_safe_steps",
            {"verdict": summary["verdict"], "situation": "before_click"},
        )
        report = call_tool(
            process,
            "generate_report_draft",
            {
                "text": SAMPLE_TEXT,
                "redacted_text": redacted,
                "risk_score": summary["risk_score"],
                "indicators": indicators,
                "safe_steps": safe_steps,
            },
        )

        print("TrustLens MCP Demo")
        print("==================")
        print(f"Server: {initialize['result']['serverInfo']['name']}")
        print(f"Tools exposed: {len(tools)}")
        print(f"Domain: {domain_report['domain']} -> {domain_report['verdict']} ({domain_report['risk_score']}/100)")
        print(f"Social signals: {', '.join(item['category'] for item in indicators) or 'none'}")
        print(f"Risk: {summary['verdict']} ({summary['risk_score']}/100), confidence {summary['confidence']}%")
        print("Score trace:")
        for item in summary["score_trace"][:4]:
            print(f"  +{item['impact']:>3} {item['label']} [{item['source']}]")
        print("First safe step:")
        print(f"  {safe_steps[0]}")
        print("Report preview:")
        print(indent_lines(report, "  "))
        return 0
    finally:
        process.stdin.close() if process.stdin else None
        process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()


def rpc(process: subprocess.Popen[str], method: str, params: dict[str, Any]) -> dict[str, Any]:
    payload = {"jsonrpc": "2.0", "id": method, "method": method, "params": params}
    assert process.stdin is not None
    assert process.stdout is not None
    process.stdin.write(json.dumps(payload) + "\n")
    process.stdin.flush()
    line = process.stdout.readline()
    if not line:
        stderr = process.stderr.read() if process.stderr else ""
        raise RuntimeError(f"MCP server closed stdout. stderr={stderr}")
    response = json.loads(line)
    if "error" in response:
        raise RuntimeError(response["error"])
    return response


def call_tool(process: subprocess.Popen[str], name: str, arguments: dict[str, Any]) -> Any:
    response = rpc(process, "tools/call", {"name": name, "arguments": arguments})
    return json.loads(response["result"]["content"][0]["text"])


def indent_lines(text: str, prefix: str) -> str:
    return "\n".join(prefix + line for line in text.splitlines())


if __name__ == "__main__":
    raise SystemExit(main())
