import contextlib
import io
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from trustlens_agent.mcp_server import handle_json_rpc  # noqa: E402


def rpc(payload):
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        handle_json_rpc(json.dumps(payload))
    return json.loads(buffer.getvalue())


class TrustLensMcpServerTests(unittest.TestCase):
    def test_lists_all_core_tools(self):
        response = rpc({"jsonrpc": "2.0", "id": 1, "method": "tools/list"})
        names = {tool["name"] for tool in response["result"]["tools"]}

        self.assertEqual(
            {
                "redact_pii",
                "extract_links",
                "inspect_domain_pattern",
                "detect_social_engineering",
                "score_risk",
                "generate_safe_steps",
                "generate_report_draft",
            },
            names,
        )

    def test_calls_score_risk_tool(self):
        response = rpc(
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "score_risk",
                    "arguments": {
                        "domain_reports": [{"risk_score": 85}],
                        "text_indicators": [
                            {"category": "Urgency & Pressure"},
                            {"category": "Financial Request"},
                        ],
                    },
                },
            }
        )
        result = json.loads(response["result"]["content"][0]["text"])

        self.assertEqual(result["verdict"], "High")
        self.assertGreaterEqual(result["risk_score"], 95)
        self.assertGreaterEqual(len(result["score_trace"]), 3)
        self.assertEqual(result["score_trace"][0]["source"], "domain_pattern")


if __name__ == "__main__":
    unittest.main()
