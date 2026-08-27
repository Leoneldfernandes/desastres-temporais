import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class MunicipalityLocatorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.page = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(encoding="utf-8")

    def test_locator_is_a_collapsed_map_control(self) -> None:
        self.assertIn('id="municipalitySearchToggle"', self.page)
        self.assertIn('aria-label="Localizar município"', self.page)
        self.assertIn('id="municipalitySearchPanel" hidden', self.page)
        self.assertLess(
            self.page.index('id="map"'),
            self.page.index('id="municipalityLocator"'),
        )
        self.assertIn("top: 122px", self.styles)
        self.assertIn("width: 44px", self.styles)
        self.assertIn("height: 44px", self.styles)

    def test_mobile_uses_a_wide_temporary_panel(self) -> None:
        mobile = re.search(
            r"@media \(max-width: 760px\) \{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(mobile)
        self.assertIn(".municipality-locator", mobile.group("body"))
        self.assertIn("left: 8px", mobile.group("body"))
        self.assertIn(".municipality-search-panel", mobile.group("body"))
        self.assertIn("width: auto", mobile.group("body"))
        self.assertIn("min-height: 44px", mobile.group("body"))

    def test_search_is_accent_insensitive_and_limits_results(self) -> None:
        self.assertIn('normalize("NFD")', self.script)
        self.assertIn("/[\\u0300-\\u036f]/g", self.script)
        self.assertIn("if (query.length < 2)", self.script)
        self.assertIn(".slice(0, 8)", self.script)
        self.assertIn("municipality-search-result-name", self.script)
        self.assertIn("municipality-search-result-uf", self.script)

    def test_keyboard_and_touch_navigation_are_supported(self) -> None:
        self.assertIn('event.key === "ArrowDown"', self.script)
        self.assertIn("result.dataset.code", self.script)
        self.assertIn("buttons[nextIndex].focus()", self.script)
        self.assertIn('event.key === "Escape"', self.script)
        self.assertIn("closeMunicipalitySearch(true)", self.script)

    def test_selection_switches_uf_only_when_needed_and_zooms_safely(self) -> None:
        self.assertIn(
            'if (state.scopeUF !== "BR" && state.scopeUF !== meta.uf)',
            self.script,
        )
        self.assertIn("await changeScope(meta.uf);", self.script)
        self.assertIn("map.fitBounds(layer.getBounds()", self.script)
        self.assertIn("maxZoom: 10", self.script)
        self.assertIn("layer.bringToFront()", self.script)

    def test_selected_municipality_is_highlighted_and_has_summary(self) -> None:
        self.assertIn('located ? "#42d6e8"', self.script)
        self.assertIn("municipalityLocatorSummary", self.script)
        self.assertIn('detailButton.textContent = "Ver detalhes"', self.script)
        self.assertIn("openMunicipalityDetail(code)", self.script)
        self.assertIn("municipalityLocatorPopup.setContent", self.script)

    def test_shared_link_restores_location_without_changing_detail_links(self) -> None:
        self.assertIn('params.get("localizar")', self.script)
        self.assertIn(
            'url.searchParams.set("localizar", state.locatedMunicipalityCode)',
            self.script,
        )
        self.assertIn('url.searchParams.set("municipio", state.detailSnapshot.code)', self.script)
        location = self.script.index(
            "await locateMunicipality(initialView.locatedMunicipalityCode);"
        )
        details = self.script.index(
            "await openMunicipalityDetail(initialView.municipalityCode);"
        )
        self.assertLess(location, details)


if __name__ == "__main__":
    unittest.main()
