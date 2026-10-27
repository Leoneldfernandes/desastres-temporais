import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]


class DataExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.page = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        cls.exporter = (ROOT / "assets" / "js" / "export.js").read_text(encoding="utf-8")
        cls.worker = (ROOT / "assets" / "js" / "export-worker.js").read_text(encoding="utf-8")
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(encoding="utf-8")

    def test_interface_exposes_approved_periods_and_formats(self) -> None:
        self.assertIn('id="openExport"', self.page)
        self.assertIn('id="exportModal"', self.page)
        self.assertIn('value="current" checked', self.page)
        self.assertIn('value="history"', self.page)
        for format_name in ("xlsx", "csv", "json", "zip"):
            self.assertIn(f'value="{format_name}"', self.page)
        self.assertIn("Excel (.xlsx) — recomendado", self.page)

    def test_export_respects_types_period_and_territorial_context(self) -> None:
        start = self.script.index("function collectExportRows")
        end = self.script.index("function exportMetadata", start)
        body = self.script[start:end]
        self.assertIn('mode === "history"', body)
        self.assertIn("state.currentPeriod", body)
        self.assertIn("rowMatchesExport", body)
        self.assertIn("state.activeTypes.has", self.script)
        self.assertIn('territory.kind === "municipality"', self.script)
        self.assertIn('territory.kind === "state"', self.script)

    def test_export_has_scientific_fields_and_provenance(self) -> None:
        for field in (
            "codigo_ibge",
            "danos_humanos_total",
            "mortos",
            "feridos",
            "enfermos",
            "desabrigados",
            "desalojados",
            "desaparecidos",
            "afetados_seca_estiagem",
            "outros_afetados",
            "prejuizo_publico_reais",
            "prejuizo_privado_reais",
            "prejuizo_total_reais",
        ):
            self.assertIn(f'["{field}"', self.exporter)
        for metadata in ("fonte_url", "fonte_versao", "fonte_sha256", "base_gerada_em"):
            self.assertIn(f"{metadata}:", self.script)

    def test_export_is_local_and_does_not_load_remote_dependencies(self) -> None:
        self.assertIn('src="assets/js/export.js?', self.page)
        self.assertNotIn("fetch(", self.exporter)
        self.assertNotIn("https://", self.exporter)
        self.assertIn("new Blob", self.exporter)
        self.assertIn("new Worker", self.script)
        self.assertIn("xlsxBlobCompressed", self.worker)
        self.assertIn("scientificPackageBlobCompressed", self.worker)

    def test_dialog_is_accessible_and_pauses_playback(self) -> None:
        self.assertIn('role="dialog"', self.page)
        self.assertIn('aria-modal="true"', self.page)
        self.assertIn('id="exportStatus" role="status" aria-live="polite"', self.page)
        self.assertIn('addPlaybackBlock("export")', self.script)
        self.assertIn('removePlaybackBlock("export")', self.script)
        self.assertIn("closeExportDialog();", self.script)
        self.assertIn(".export-modal", self.styles)

    def test_generated_xlsx_and_scientific_zip_are_valid(self) -> None:
        sample = {
            "periodo": "2025-01",
            "ano": 2025,
            "mes": 1,
            "codigo_ibge": "4205407",
            "municipio": "Florianópolis",
            "uf": "SC",
            "tipologia": "Chuvas Intensas",
            "ocorrencias": 1,
            "danos_humanos_total": 2,
            "mortos": 0,
            "feridos": 1,
            "enfermos": 0,
            "desabrigados": 0,
            "desalojados": 1,
            "desaparecidos": 0,
            "afetados_seca_estiagem": 0,
            "outros_afetados": 0,
            "prejuizo_publico_reais": 10.5,
            "prejuizo_privado_reais": 5,
            "prejuizo_total_reais": 15.5,
        }
        metadata = {
            "gerado_em": "2026-08-29T00:00:00Z",
            "recorte_territorial": "Santa Catarina — SC",
            "periodo_exportado": "2025-01",
            "tipologias": ["Chuvas Intensas"],
            "quantidade_linhas": 1,
        }
        with tempfile.TemporaryDirectory() as raw:
            folder = Path(raw)
            node_script = f"""
require('./assets/js/export.js');
const fs = require('fs');
const rows = {json.dumps([sample], ensure_ascii=False)};
const metadata = {json.dumps(metadata, ensure_ascii=False)};
Promise.all([
  AtlasExport.xlsxBlob(rows, metadata).arrayBuffer(),
  AtlasExport.scientificPackageBlob(rows, metadata).arrayBuffer()
]).then(([xlsx, zip]) => {{
  fs.writeFileSync({json.dumps(str(folder / 'dados.xlsx'))}, Buffer.from(xlsx));
  fs.writeFileSync({json.dumps(str(folder / 'dados.zip'))}, Buffer.from(zip));
}});
"""
            result = subprocess.run(
                ["node", "-e", node_script],
                cwd=ROOT,
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

            with ZipFile(folder / "dados.xlsx") as workbook:
                self.assertIsNone(workbook.testzip())
                self.assertIn("xl/worksheets/sheet1.xml", workbook.namelist())
                self.assertIn("Florianópolis", workbook.read("xl/worksheets/sheet1.xml").decode())
                self.assertIn("Dicionário", workbook.read("xl/workbook.xml").decode())

            with ZipFile(folder / "dados.zip") as package:
                self.assertIsNone(package.testzip())
                self.assertEqual(
                    set(package.namelist()),
                    {"dados.csv", "metadados.json", "dicionario_dados.csv", "LEIA-ME.txt"},
                )
                self.assertTrue(package.read("dados.csv").startswith(b"\xef\xbb\xbf"))
                stored_metadata = json.loads(package.read("metadados.json"))
                self.assertEqual(stored_metadata["quantidade_linhas"], 1)


if __name__ == "__main__":
    unittest.main()
