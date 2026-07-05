import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from trustlens_agent.tools import (  # noqa: E402
    detect_social_engineering,
    extract_links,
    inspect_domain_pattern,
    redact_pii,
    score_risk,
)


class TrustLensToolTests(unittest.TestCase):
    def test_redact_pii_masks_common_sensitive_values(self):
        text = "Email john@example.com, phone +40722334455, CNP 1900101998877, card 4111 1111 1111 1111"
        redacted = redact_pii(text)

        self.assertIn("[REDACTED_EMAIL]", redacted)
        self.assertIn("[REDACTED_PHONE]", redacted)
        self.assertIn("[REDACTED_SSN]", redacted)
        self.assertIn("[REDACTED_CREDIT_CARD]", redacted)
        self.assertNotIn("john@example.com", redacted)

    def test_extract_links_normalizes_domains_without_fetching(self):
        links = extract_links("Check https://www.paypal-security.xyz/login and www.example.com/help")

        self.assertEqual(
            [link["domain"] for link in links],
            ["paypal-security.xyz", "example.com"],
        )

    def test_domain_inspection_avoids_short_brand_substring_false_positive(self):
        report = inspect_domain_pattern("dhl.customs-fee-handling.xyz")

        self.assertIn("dhl", report["detected_brands"])
        self.assertNotIn("ing", report["detected_brands"])
        self.assertNotIn("Impersonates brand 'ing' in a suspicious domain layout", report["indicators"])

    def test_domain_inspection_flags_exact_short_brand_tokens(self):
        report = inspect_domain_pattern("bt-verificare-securizata.today")

        self.assertEqual(report["verdict"], "High")
        self.assertIn("bt", report["detected_brands"])
        self.assertTrue(any("Suspicious top-level domain" in item for item in report["indicators"]))

    def test_social_engineering_and_score_work_together(self):
        indicators = detect_social_engineering(
            "Banca Transilvania: cont blocat urgent, login pentru verificare card"
        )
        domain_report = inspect_domain_pattern("bt-verificare-securizata.today")
        summary = score_risk([domain_report], indicators)

        self.assertGreaterEqual(len(indicators), 3)
        self.assertEqual(summary["verdict"], "High")
        self.assertGreaterEqual(summary["risk_score"], 95)
        self.assertGreaterEqual(len(summary["score_trace"]), 3)
        self.assertEqual(summary["score_trace"][0]["source"], "domain_pattern")
        self.assertTrue(any(item["label"] == "Domain plus persuasion combo" for item in summary["score_trace"]))


if __name__ == "__main__":
    unittest.main()
