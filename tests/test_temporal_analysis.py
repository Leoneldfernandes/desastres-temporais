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

    def test_three_territorial_series_and_separate_metrics_are_exposed(self) -> None:
        self.assertIn('data-temporal-context="brazil"', self.page)
        self.assertIn('data-temporal-context="state"', self.page)
        self.assertIn('data-temporal-context="municipality"', self.page)
        self.assertIn('id="temporalState"', self.page)
        self.assertIn('id="temporalMunicipality"', self.page)
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
        self.assertIn('state.temporalContext === "state"', function_body)
        self.assertIn("meta.uf !== stateUf", function_body)
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
        for parameter in ("historico", "estado", "indicador", "grafico"):
            self.assertIn(f'params.get("{parameter}")', self.script)
            self.assertIn(f'url.searchParams.set("{parameter}"', self.script)
        self.assertIn('params.get("serie")', self.script)
        self.assertRegex(self.script, r'url\.searchParams\.set\(\s*"serie"')
        self.assertIn("temporalIndexFromPointer(event)", self.script)
        self.assertIn("setPeriod(temporalIndexFromPointer(event))", self.script)

    def test_zero_language_does_not_claim_unavailable_precision(self) -> None:
        self.assertIn('valueText = "Sem ocorrência"', self.script)
        self.assertIn('valueText = "Sem valor positivo registrado"', self.script)
        self.assertNotIn("zero declarado", self.script.lower())

    def test_month_information_uses_the_free_header_area_instead_of_covering_chart(self) -> None:
        header = self.page.index('class="temporal-analysis-header"')
        information = self.page.index('id="temporalChartTooltip"', header)
        chart = self.page.index('class="temporal-chart-wrap"', information)
        self.assertLess(header, information)
        self.assertLess(information, chart)
        self.assertIn('grid-template-areas:', self.styles)
        self.assertIn('"heading information metrics"', self.styles)
        self.assertIn('"contexts information metrics"', self.styles)
        tooltip_style = re.search(
            r"\.temporal-chart-tooltip\s*\{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(tooltip_style)
        self.assertIn("grid-area: information", tooltip_style.group("body"))
        self.assertNotIn("position: absolute", tooltip_style.group("body"))

    def test_desktop_controls_stay_linear_around_the_information_panel(self) -> None:
        self.assertIn(".timeline.is-analysis-expanded { max-width: 1040px; }", self.styles)
        context_style = re.search(
            r"\.temporal-context-options\s*\{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        metric_style = re.search(
            r"\.temporal-metric-options\s*\{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(context_style)
        self.assertIsNotNone(metric_style)
        self.assertIn("flex-wrap: nowrap", context_style.group("body"))
        self.assertIn("flex-wrap: nowrap", metric_style.group("body"))
        self.assertIn("white-space: normal", self.styles)
        self.assertIn(".temporal-metric-options .temporal-option { white-space: nowrap; }", self.styles)

    def test_chart_defaults_to_collapsed_and_keeps_touch_targets(self) -> None:
        self.assertIn('const temporalExpanded = params.get("grafico") === "aberto"', self.script)
        self.assertIn('id="temporalAnalysis" hidden', self.page)
        self.assertIn('aria-expanded="false"', self.page)
        self.assertIn('>Abrir série temporal</button>', self.page)
        mobile = re.search(
            r"@media \(max-width: 760px\) \{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(mobile)
        self.assertIn(".temporal-analysis-header", mobile.group("body"))
        self.assertIn('"information"', mobile.group("body"))
        self.assertIn(".temporal-context-options", mobile.group("body"))
        self.assertIn("flex-wrap: wrap", mobile.group("body"))
        self.assertIn(".temporal-analysis-toggle", mobile.group("body"))
        self.assertIn(".temporal-option", mobile.group("body"))
        self.assertGreaterEqual(mobile.group("body").count("min-height: 44px"), 2)
        self.assertIn("overflow-y: auto", mobile.group("body"))

    def test_playback_speed_and_series_toggle_share_one_control_row(self) -> None:
        self.assertIn('class="playback-tools"', self.page)
        playback = self.page.index('class="playback-tools"')
        player = self.page.index('class="player-controls"', playback)
        speed = self.page.index('class="field speed-field"', playback)
        toggle = self.page.index('id="toggleTemporalAnalysis"', playback)
        self.assertLess(player, speed)
        self.assertLess(speed, toggle)
        self.assertIn('grid-template-areas: "period playback"', self.styles)
        self.assertIn("gap: 8px", self.styles)

    def test_missing_municipality_opens_the_existing_locator(self) -> None:
        self.assertIn('>Selecionar município</button>', self.page)
        start = self.script.index("function setTemporalContext(context)")
        end = self.script.index("function setTemporalMunicipality", start)
        function_body = self.script[start:end]
        self.assertIn('context === "municipality" && !state.temporalMunicipalityCode', function_body)
        self.assertIn("openMunicipalitySearch();", function_body)
        self.assertIn('!event.target.closest("#temporalMunicipality")', self.script)
        self.assertNotIn("dom.temporalMunicipality.disabled", self.script)

    def test_map_credits_and_scale_follow_the_real_timeline_height(self) -> None:
        self.assertIn("function syncMapControlOffset()", self.script)
        self.assertIn("new ResizeObserver(syncMapControlOffset)", self.script)
        self.assertIn("--map-bottom-controls-offset", self.script)
        self.assertRegex(
            self.styles,
            r"\.leaflet-bottom\.leaflet-right\s*\{\s*bottom: 0;",
        )
        self.assertRegex(
            self.styles,
            r"(?s)\.leaflet-control-scale\s*\{.*?bottom: var\(--map-bottom-controls-offset, 118px\)",
        )
        self.assertRegex(
            self.styles,
            r"(?s)\.leaflet-control-attribution\s*\{.*?margin: 0 !important;",
        )

    def test_chart_is_keyboard_accessible_and_fullscreen_compatible(self) -> None:
        self.assertIn('role="slider"', self.page)
        self.assertIn('aria-valuemin="0"', self.page)
        self.assertIn('aria-valuemax="419"', self.page)
        self.assertIn('id="temporalChartStatus" aria-live="polite"', self.page)
        self.assertIn("dom.temporalChart.setAttribute(\"aria-valuetext\"", self.script)
        self.assertIn(".map-stage.temporal-analysis-open .leaflet-bottom.leaflet-right", self.styles)


if __name__ == "__main__":
    unittest.main()
