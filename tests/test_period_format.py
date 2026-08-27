import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PeriodFormatTests(unittest.TestCase):
    def test_only_timeline_uses_mm_yyyy(self) -> None:
        script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        page = (ROOT / "index.html").read_text(encoding="utf-8")

        numeric_function = re.search(
            r"function numericPeriodLabel\(period\) \{(?P<body>.*?)\n\}",
            script,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(numeric_function)
        self.assertIn('String(period).split("-")', numeric_function.group("body"))
        self.assertIn("`${month}/${year}`", numeric_function.group("body"))
        self.assertIn("const monthLong", script)
        self.assertIn("const monthShort", script)
        self.assertIn("const label = periodLabel(period);", script)
        self.assertIn("const numericLabel = numericPeriodLabel(period);", script)
        self.assertIn("dom.displayPeriod.textContent = numericLabel;", script)
        self.assertIn("dom.kpiPeriod.textContent = label;", script)
        self.assertIn("dom.resultsPeriod.textContent = label;", script)
        self.assertIn("dom.detailEyebrow.textContent = `${periodLabel(period)}", script)
        self.assertRegex(script, r"periodLabel\([^\n]*,\s*true\)")
        self.assertIn("dom.minPeriod.textContent = numericPeriodLabel", script)
        self.assertIn("dom.maxPeriod.textContent = numericPeriodLabel", script)
        self.assertIn('<span id="minPeriod">01/1991</span>', page)
        self.assertIn('<span id="maxPeriod">12/2025</span>', page)


if __name__ == "__main__":
    unittest.main()
