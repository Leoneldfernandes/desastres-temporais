import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class EventDetailInteractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(encoding="utf-8")

    def test_hover_keeps_summary_and_click_opens_complete_records(self) -> None:
        self.assertIn("mouseover: (event) => handleMunicipalityHover(event, code)", self.script)
        self.assertIn("mousemove: (event) => handleMunicipalityMove(event, code)", self.script)
        self.assertIn("mouseout: () => handleMunicipalityOut(code)", self.script)
        self.assertIn("click: () => openMunicipalityDetail(code)", self.script)
        self.assertIn("Clique para abrir os registros completos.", self.script)

    def test_only_positive_human_values_receive_typology_color(self) -> None:
        function = re.search(
            r"function detailMetric\(.*?\n\}", self.script, flags=re.DOTALL
        )
        self.assertIsNotNone(function)
        self.assertIn("if (value > 0 && typeColor)", function.group(0))
        self.assertIn('classes.push("event-metric--human-positive")', function.group(0))
        self.assertIn("--event-color:", function.group(0))
        self.assertEqual(self.script.count("{ typeColor: type.color }"), 9)
        self.assertIn(".event-metric--human-positive", self.styles)
        self.assertIn("var(--event-color)", self.styles)

    def test_financial_scale_uses_approved_fixed_ranges(self) -> None:
        self.assertIn('if (value <= 100_000) return "low";', self.script)
        self.assertIn('if (value <= 1_000_000) return "moderate";', self.script)
        self.assertIn('if (value <= 10_000_000) return "high";', self.script)
        self.assertIn('return "very-high";', self.script)
        self.assertEqual(self.script.count("financial: true"), 2)
        for level in ("low", "moderate", "high", "very-high"):
            self.assertIn(f".event-metric--financial-{level}", self.styles)

    def test_detail_legend_explains_financial_colors(self) -> None:
        self.assertIn("Prejuízos econômicos", self.script)
        self.assertNotIn("Danos humanos: cor da tipologia", self.script)
        self.assertIn("Até R$ 100 mil", self.script)
        self.assertIn("R$ 100 mil a R$ 1 milhão", self.script)
        self.assertIn("R$ 1 milhão a R$ 10 milhões", self.script)
        self.assertIn("Acima de R$ 10 milhões", self.script)
        self.assertIn('class="detail-legend"', self.script)
        self.assertIn("dom.detailContent.innerHTML = summary + cards + legend;", self.script)
        self.assertIn(".detail-legend", self.styles)
        self.assertIn("margin-top: 12px", self.styles)

    def test_results_table_keeps_all_columns_visible_on_an_opaque_surface(self) -> None:
        table = re.search(r"\.virtual-table\s*\{(?P<body>.*?)\n\}", self.styles, re.DOTALL)
        canvas = re.search(r"\.virtual-canvas\s*\{(?P<body>.*?)\n\}", self.styles, re.DOTALL)
        grid = re.search(
            r"\.virtual-head,\s*\n\.virtual-row\s*\{(?P<body>.*?)\n\}",
            self.styles,
            re.DOTALL,
        )
        row_start = self.styles.index(".virtual-row {", self.styles.index(".virtual-canvas"))
        row_end = self.styles.index("\n}", row_start)
        row = self.styles[row_start:row_end]
        self.assertIsNotNone(table)
        self.assertIsNotNone(canvas)
        self.assertIsNotNone(grid)
        self.assertIn("contain: paint", table.group("body"))
        self.assertIn("background: #07111f", table.group("body"))
        self.assertIn("overflow-x: hidden", table.group("body"))
        self.assertIn("overflow-y: auto", table.group("body"))
        self.assertIn("overflow: visible", canvas.group("body"))
        self.assertIn("background: #07111f", canvas.group("body"))
        self.assertIn("background: #07111f", row)
        self.assertIn(
            "grid-template-columns: minmax(70px, 1.05fr) "
            "minmax(78px, 1.2fr) 43px 56px",
            grid.group("body"),
        )
        self.assertIn("gap: 5px", grid.group("body"))


if __name__ == "__main__":
    unittest.main()
