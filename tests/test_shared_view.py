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

    def test_share_button_has_approved_label_and_fixed_desktop_layout(self) -> None:
        self.assertIn('id="shareView"', self.page)
        self.assertIn('id="shareViewLabel">Compartilhar visualização', self.page)
        self.assertLess(self.page.index('class="period-share"'), self.page.index('class="player-controls"'))
        self.assertIn('grid-template-areas: "period player speed"', self.styles)
        self.assertIn("grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)", self.styles)

    def test_share_button_looks_clickable_and_keeps_two_line_label(self) -> None:
        self.assertIn('class="share-view-icon"', self.page)
        self.assertLess(self.page.index('id="shareViewLabel"'), self.page.index('class="share-view-icon"'))
        self.assertIn("width: 112px", self.styles)
        self.assertIn("min-height: 36px", self.styles)
        self.assertIn("gap: 2px", self.styles)
        self.assertIn("justify-content: center", self.styles)
        self.assertIn("text-align: center", self.styles)
        self.assertIn("width: 66px", self.styles)
        self.assertIn("flex: 0 0 66px", self.styles)
        self.assertIn("border: 1px solid var(--line-strong)", self.styles)
        self.assertIn("background: var(--surface-2)", self.styles)
        self.assertIn("white-space: normal", self.styles)

    def test_mobile_places_share_action_below_playback_controls(self) -> None:
        mobile = re.search(
            r"@media \(max-width: 760px\) \{(?P<body>.*?)\n\}",
            self.styles,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(mobile)
        self.assertIn('"player player"', mobile.group("body"))
        self.assertIn('"share share"', mobile.group("body"))
        self.assertIn(".share-view-button", mobile.group("body"))
        self.assertIn("grid-area: share", mobile.group("body"))

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
