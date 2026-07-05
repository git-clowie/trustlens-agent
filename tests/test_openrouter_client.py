import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from trustlens_agent.openrouter_client import generate_gemma_analysis  # noqa: E402


class OpenRouterClientTests(unittest.TestCase):
    def test_missing_key_returns_marked_fallback(self):
        with patch.dict(os.environ, {"OPENROUTER_API_KEY": ""}):
            analysis = generate_gemma_analysis(
                redacted_text="DHL payment request at [REDACTED_URL]",
                situation="before_click",
                summary={
                    "verdict": "High",
                    "risk_score": 95,
                    "confidence": 98,
                    "breakdown": ["Unsafe destination link detected."],
                },
                domain_reports=[{"domain": "dhl.customs-fee-handling.xyz", "risk_score": 85}],
                social_engineering_indicators=[{"category": "Urgency & Pressure"}],
                safe_steps=["DO NOT click any link in the message."],
            )

        self.assertTrue(analysis["fallback_used"])
        self.assertEqual(analysis["provider"], "offline_rules")
        self.assertEqual(analysis["recommended_priority"], "urgent")
        self.assertIn("executive_summary", analysis)
        self.assertGreaterEqual(len(analysis["evidence"]), 1)


if __name__ == "__main__":
    unittest.main()
