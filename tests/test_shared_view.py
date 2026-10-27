import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SharedViewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.page = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(encoding="utf-8")

    def test_share_button_has_approved_label_and_stays_in_map_tools(self) -> None:
        self.assertIn('id="shareView"', self.page)
        self.assertIn('aria-label="Compartilhar visualização"', self.page)
        self.assertIn('data-tooltip="Compartilhar visualização"', self.page)
        self.assertLess(self.page.index('id="toggleFullscreen"'), self.page.index('id="shareView"'))
        self.assertLess(self.page.index('id="shareView"'), self.page.index('class="north-indicator"'))
        self.assertLess(self.page.index('class="player-controls"'), self.page.index('class="period-share"'))
        self.assertIn('grid-template-areas: "player period settings"', self.styles)
        self.assertIn("grid-template-columns: minmax(0, 1fr) 126px minmax(0, 1fr)", self.styles)

    def test_share_button_matches_tools_and_exposes_hover_and_keyboard_labels(self) -> None:
        self.assertIn('class="share-view-icon"', self.page)
        self.assertIn('class="map-tool-button share-view-button"', self.page)
        self.assertIn('role="status" aria-live="polite"', self.page)
        self.assertIn(".map-tool-button:hover::after", self.styles)
        self.assertIn(".map-tool-button:focus-visible::after", self.styles)
        self.assertIn(".municipality-search-toggle:hover::after", self.styles)
        self.assertIn(".municipality-search-toggle:focus-visible::after", self.styles)
        self.assertIn("content: attr(data-tooltip)", self.styles)
        self.assertIn("border: 1px solid var(--line-strong)", self.styles)

    def test_mobile_keeps_share_in_tools_without_an_empty_playback_row(self) -> None:
        mobile = re.search(
            r"@media \(max-width: 760px\) \{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(mobile)
        self.assertIn('"player"', mobile.group("body"))
        self.assertIn('"settings"', mobile.group("body"))
        self.assertNotIn('"share"', mobile.group("body"))
        self.assertNotIn("grid-area: share", self.styles)
        self.assertIn("width: 44px", mobile.group("body"))

    def test_url_preserves_scope_period_types_and_open_municipality(self) -> None:
        self.assertIn('params.get("uf")', self.script)
        self.assertIn('params.get("mes")', self.script)
        self.assertIn('params.get("tipos")', self.script)
        self.assertIn('params.get("municipio")', self.script)
        self.assertIn('url.searchParams.set("uf", state.scopeUF)', self.script)
        self.assertIn('url.searchParams.set("mes", state.periods[state.currentPeriod])', self.script)
        self.assertIn('url.searchParams.set("tipos", "nenhum")', self.script)
        self.assertIn('url.searchParams.set("municipio", state.detailSnapshot.code)', self.script)
        self.assertIn("window.history.replaceState", self.script)

    def test_initialization_restores_view_before_opening_details(self) -> None:
        restore = self.script.index("const initialView = viewStateFromUrl();")
        period = self.script.index("setPeriod(initialView.periodIndex);")
        details = self.script.index("await openMunicipalityDetail(initialView.municipalityCode);")
        self.assertLess(restore, period)
        self.assertLess(period, details)
        self.assertIn("applyTypeSelection(initialView.types);", self.script)

    def test_copy_action_has_feedback_and_fallback(self) -> None:
        self.assertIn("navigator.clipboard.writeText(url)", self.script)
        self.assertIn('dom.shareViewLabel.textContent = "Link copiado"', self.script)
        self.assertIn('document.execCommand("copy")', self.script)


if __name__ == "__main__":
    unittest.main()
