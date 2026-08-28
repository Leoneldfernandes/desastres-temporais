import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class TemporalAnalysisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.page = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(encoding="utf-8")
        cls.manifest = json.loads((ROOT / "data" / "manifest.json").read_text(encoding="utf-8"))

    def test_expandable_chart_is_integrated_with_the_existing_timeline(self) -> None:
        timeline = self.page.index('<section class="timeline"')
        chart = self.page.index('id="temporalChart"')
        player = self.page.index('class="timeline-topline"')
        map_stage_end = self.page.index('<aside class="sidebar sidebar-right"')
        self.assertLess(timeline, chart)
        self.assertLess(chart, player)
        self.assertLess(player, map_stage_end)
        self.assertIn('id="toggleTemporalAnalysis"', self.page)
        self.assertIn('aria-controls="temporalAnalysis"', self.page)

    def test_two_contexts_and_three_separate_metrics_are_exposed(self) -> None:
        self.assertIn('data-temporal-context="general"', self.page)
        self.assertIn('data-temporal-context="municipality"', self.page)
        self.assertIn('data-temporal-metric="events"', self.page)
        self.assertIn('data-temporal-metric="human"', self.page)
        self.assertIn('data-temporal-metric="loss"', self.page)
        self.assertIn('axisLabel: "Ocorrências (nº)"', self.script)
        self.assertIn('axisLabel: "Danos humanos (pessoas)"', self.script)
        self.assertIn('axisLabel: "Prejuízos econômicos (R$)"', self.script)

    def test_series_uses_the_complete_monthly_period_and_current_filters(self) -> None:
        self.assertEqual(len(self.manifest["periods"]), 420)
        self.assertEqual(self.manifest["periods"][0], "1991-01")
        self.assertEqual(self.manifest["periods"][-1], "2025-12")
        start = self.script.index("function buildTemporalSeries()")
        end = self.script.index("function temporalEntryValue", start)
        function_body = self.script[start:end]
        self.assertIn("state.summaryByPeriod", function_body)
        self.assertIn("state.activeTypes.has", function_body)
        self.assertIn('state.scopeUF !== "BR"', function_body)
        self.assertIn("code !== municipalityCode", function_body)

    def test_playback_moves_selection_without_recalculating_the_series(self) -> None:
        start = self.script.index("function setPeriod(index)")
        end = self.script.index("function tooltipContent", start)
        function_body = self.script[start:end]
        self.assertIn("updateTemporalChartSelection();", function_body)
        self.assertNotIn("refreshTemporalSeries", function_body)

        playback_start = self.script.index("function schedulePlayback")
        playback_end = self.script.index("function syncPlaybackUi", playback_start)
        self.assertIn("setPeriod(state.currentPeriod + 1)", self.script[playback_start:playback_end])

    def test_scope_types_and_municipality_refresh_the_historical_series(self) -> None:
        self.assertIn("function setTemporalMunicipality(code, select = true)", self.script)
        self.assertIn("if (!state.restoringView) setTemporalMunicipality(code, true);", self.script)
        self.assertGreaterEqual(self.script.count("refreshTemporalSeries();"), 6)
        self.assertIn("refreshTemporalSeries();\n    setPeriod(state.currentPeriod);", self.script)
        self.assertIn("refreshTemporalSeries();\n  setPeriod(state.currentPeriod);", self.script)

    def test_chart_selection_and_state_are_shareable(self) -> None:
        for parameter in ("historico", "serie", "indicador", "grafico"):
            self.assertIn(f'params.get("{parameter}")', self.script)
            self.assertIn(f'url.searchParams.set("{parameter}"', self.script)
        self.assertIn("temporalIndexFromPointer(event)", self.script)
        self.assertIn("setPeriod(temporalIndexFromPointer(event))", self.script)

    def test_zero_language_does_not_claim_unavailable_precision(self) -> None:
        self.assertIn('valueText = "Sem ocorrência"', self.script)
        self.assertIn('valueText = "Sem valor positivo registrado"', self.script)
        self.assertNotIn("zero declarado", self.script.lower())

    def test_mobile_defaults_to_collapsed_and_keeps_touch_targets(self) -> None:
        self.assertIn('!window.matchMedia("(max-width: 760px)").matches', self.script)
        mobile = re.search(
            r"@media \(max-width: 760px\) \{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(mobile)
        self.assertIn(".temporal-analysis-toggle", mobile.group("body"))
        self.assertIn(".temporal-option", mobile.group("body"))
        self.assertGreaterEqual(mobile.group("body").count("min-height: 44px"), 2)
        self.assertIn("overflow-y: auto", mobile.group("body"))

    def test_chart_is_keyboard_accessible_and_fullscreen_compatible(self) -> None:
        self.assertIn('role="slider"', self.page)
        self.assertIn('aria-valuemin="0"', self.page)
        self.assertIn('aria-valuemax="419"', self.page)
        self.assertIn('id="temporalChartStatus" aria-live="polite"', self.page)
        self.assertIn("dom.temporalChart.setAttribute(\"aria-valuetext\"", self.script)
        self.assertIn(".map-stage.temporal-analysis-open .leaflet-bottom.leaflet-right", self.styles)


if __name__ == "__main__":
    unittest.main()
