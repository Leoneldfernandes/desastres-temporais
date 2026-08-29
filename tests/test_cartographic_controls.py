import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class CartographicControlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.page = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(encoding="utf-8")

    def test_map_exposes_fullscreen_home_and_north_controls(self) -> None:
        self.assertIn('id="mapStage"', self.page)
        self.assertIn('id="toggleFullscreen"', self.page)
        self.assertIn('id="resetMapView"', self.page)
        self.assertIn('class="north-indicator"', self.page)
        self.assertIn('aria-label="Norte"', self.page)
        self.assertLess(self.page.index('id="map"'), self.page.index('id="toggleFullscreen"'))
        locator = self.page.index('id="municipalityLocator"')
        fullscreen = self.page.index('id="toggleFullscreen"')
        panorama = self.page.index('id="resetMapView"')
        self.assertLess(locator, fullscreen)
        self.assertLess(fullscreen, panorama)
        self.assertRegex(
            self.styles,
            r"(?s)\.north-indicator\s*\{.*?top: 178px;.*?right: 17px;.*?drop-shadow",
        )

    def test_scale_is_metric_and_stays_four_pixels_above_credits(self) -> None:
        self.assertIn("L.control.scale({", self.script)
        self.assertIn("metric: true", self.script)
        self.assertIn("imperial: false", self.script)
        self.assertIn("maxWidth: 110", self.script)
        self.assertIn(".leaflet-bottom.leaflet-right", self.styles)
        self.assertIn(".leaflet-control-scale-line", self.styles)
        self.assertIn("--map-scale-bottom", self.styles)
        self.assertRegex(
            self.styles,
            r"\.leaflet-bottom\.leaflet-right\s*\{\s*bottom: 0;",
        )
        self.assertIn(".leaflet-control-scale {", self.styles)
        self.assertIn("const MAP_SCALE_CREDIT_GAP = 4;", self.script)
        self.assertIn('querySelector(".leaflet-control-attribution")', self.script)
        self.assertIn("creditHeight + MAP_SCALE_CREDIT_GAP", self.script)
        self.assertIn("new ResizeObserver(syncMapScaleOffset)", self.script)
        self.assertNotIn("timelineBounds.top", self.script)

    def test_home_returns_to_the_current_scope_without_changing_filters(self) -> None:
        start = self.script.index("function resetMapToScope()")
        end = self.script.index("function mapIsFullscreen()", start)
        function_body = self.script[start:end]
        self.assertIn("state.geoLayer.getBounds()", function_body)
        self.assertIn("map.fitBounds", function_body)
        self.assertNotIn("changeScope", function_body)
        self.assertNotIn("setPeriod", function_body)

    def test_fullscreen_has_native_mode_and_safe_fallback(self) -> None:
        self.assertIn('typeof dom.mapStage.requestFullscreen === "function"', self.script)
        self.assertIn("await dom.mapStage.requestFullscreen()", self.script)
        self.assertIn("await document.exitFullscreen()", self.script)
        self.assertIn("enterPseudoFullscreen()", self.script)
        self.assertIn('document.addEventListener("fullscreenchange"', self.script)
        self.assertIn("map.invalidateSize({ animate: false })", self.script)
        self.assertIn(".map-stage.is-pseudo-fullscreen", self.styles)

    def test_mobile_controls_keep_touch_sized_targets(self) -> None:
        mobile = re.search(
            r"@media \(max-width: 760px\) \{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(mobile)
        self.assertIn(".map-tool-button", mobile.group("body"))
        self.assertIn("width: 44px", mobile.group("body"))
        self.assertIn("height: 44px", mobile.group("body"))
        self.assertIn(".north-indicator", mobile.group("body"))


if __name__ == "__main__":
    unittest.main()
