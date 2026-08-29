import json
import unittest
from pathlib import Path

from scripts import build_data


ROOT = Path(__file__).resolve().parents[1]

APPROVED_TYPE_COLORS = {
    "Alagamentos": "#00B8D9",
    "Chuvas Intensas": "#2979FF",
    "Doenças infecciosas": "#D45A9B",
    "Enxurradas": "#A96B3B",
    "Erosão": "#A1887F",
    "Estiagem e Seca": "#F9A825",
    "Granizo": "#B0BEC5",
    "Incêndio Florestal": "#C62828",
    "Inundações": "#005B96",
    "Movimento de Massa": "#B2B250",
    "Onda de Calor e Baixa Umidade": "#D95F02",
    "Onda de Frio": "#80DEEA",
    "Outros": "#4B5563",
    "Rompimento/Colapso de barragens": "#8E245A",
    "Tornado": "#5E35B1",
    "Vendavais e Ciclones": "#00897B",
}

APPROVED_FINANCIAL_COLORS = {
    "low": "#ffffb2",
    "moderate": "#fecc5c",
    "high": "#fd8d3c",
    "very-high": "#e31a1c",
}


class ScientificColorPaletteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.manifest = json.loads(
            (ROOT / "data" / "manifest.json").read_text(encoding="utf-8")
        )
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(
            encoding="utf-8"
        )

    def test_generator_uses_the_approved_typology_palette(self) -> None:
        self.assertEqual(build_data.TYPE_COLORS, APPROVED_TYPE_COLORS)
        self.assertEqual(len(set(build_data.TYPE_COLORS.values())), 16)

    def test_published_manifest_matches_the_generator_palette(self) -> None:
        published = {item["name"]: item["color"] for item in self.manifest["types"]}
        self.assertEqual(published, APPROVED_TYPE_COLORS)

    def test_approved_water_colors_remain_visually_distinct(self) -> None:
        self.assertEqual(build_data.TYPE_COLORS["Alagamentos"], "#00B8D9")
        self.assertEqual(build_data.TYPE_COLORS["Chuvas Intensas"], "#2979FF")
        self.assertEqual(build_data.TYPE_COLORS["Enxurradas"], "#A96B3B")
        self.assertEqual(build_data.TYPE_COLORS["Inundações"], "#005B96")

    def test_financial_ranges_use_one_sequential_palette(self) -> None:
        for level, color in APPROVED_FINANCIAL_COLORS.items():
            self.assertIn(
                f".detail-legend-swatch.financial-{level} {{ background: {color}; }}",
                self.styles,
            )
            self.assertIn(
                f".event-metric--financial-{level} {{ --financial-color: {color}; }}",
                self.styles,
            )


if __name__ == "__main__":
    unittest.main()
