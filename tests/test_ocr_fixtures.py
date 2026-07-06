import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from trustlens_agent.adk_agent import ocr_screenshot  # noqa: E402


class TrustLensOcrFixtureTests(unittest.TestCase):
    def test_fixture_markers_return_deterministic_text_even_with_key_set(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "demo-key"}):
            bank_text = ocr_screenshot("TRUSTLENS_FIXTURE_BANK_SCREENSHOT", "image/svg+xml")
            qr_text = ocr_screenshot("TRUSTLENS_FIXTURE_QR_SCREENSHOT", "image/svg+xml")

        self.assertIn("paypal-account-review.net", bank_text)
        self.assertIn("microsoft365-login-review.com", qr_text)


if __name__ == "__main__":
    unittest.main()
