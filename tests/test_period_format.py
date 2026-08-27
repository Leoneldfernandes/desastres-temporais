import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PeriodFormatTests(unittest.TestCase):
    def test_months_are_displayed_as_mm_yyyy_everywhere(self) -> None:
        script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        page = (ROOT / "index.html").read_text(encoding="utf-8")

        function = re.search(
            r"function periodLabel\(period\) \{(?P<body>.*?)\n\}",
            script,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(function)
        self.assertIn('String(period).split("-")', function.group("body"))
        self.assertIn("`${month}/${year}`", function.group("body"))
        self.assertNotIn("monthLong", script)
        self.assertNotIn("monthShort", script)
        self.assertNotRegex(script, r"periodLabel\([^\n]*,\s*true\)")
        self.assertIn('<span id="minPeriod">01/1991</span>', page)
        self.assertIn('<span id="maxPeriod">12/2025</span>', page)


if __name__ == "__main__":
    unittest.main()
