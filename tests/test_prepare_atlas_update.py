from __future__ import annotations

import gzip
import json
import tempfile
import unittest
from pathlib import Path

from scripts.prepare_atlas_update import (
    compare_releases,
    release_metadata,
    report_markdown,
)
from scripts.check_atlas_update import parse_release_url
from scripts.sync_release_metadata import (
    END_MARKER,
    METHODOLOGY_END_MARKER,
    METHODOLOGY_START_MARKER,
    START_MARKER,
    sync_methodology,
    sync_readme,
)


CURRENT_URL = (
    "https://atlasdigital.mdr.gov.br/arquivos/2026/"
    "BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv"
)
NEW_URL = (
    "https://atlasdigital.mdr.gov.br/arquivos/2027/"
    "BD_Atlas_1991_2026_v1.0_2027.05.20_Consolidado.csv"
)
EVENT_COLUMNS = [
    "period",
    "municipalityCode",
    "type",
    "protocol",
    "eventDate",
    "registrationDate",
    "humanTotal",
    "deaths",
    "injured",
    "sick",
    "homeless",
    "displaced",
    "missing",
    "droughtAffected",
    "otherAffected",
    "publicLoss",
    "privateLoss",
]


class PrepareAtlasUpdateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.current = self.root / "current"
        self.candidate = self.root / "candidate"

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def event(
        self,
        protocol: str,
        *,
        event_date: str = "2025-01-01",
        human_total: int = 10,
    ) -> list[object]:
        return [
            0,
            "4205407",
            0,
            protocol,
            event_date,
            "2025-01-02",
            human_total,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            human_total,
            100.0,
            50.0,
        ]

    def write_data(
        self,
        root: Path,
        *,
        source_url: str,
        rows: list[list[object]],
    ) -> None:
        release = parse_release_url(source_url)
        (root / "events").mkdir(parents=True)
        manifest = {
            "version": release.label,
            "sourceUrl": source_url,
            "sourceSha256": "a" * 64,
            "generatedAt": "2027-05-20T12:00:00+00:00",
            "periods": [f"{release.start_year}-01", f"{release.end_year}-12"],
            "types": [{"id": 0, "name": "Alagamentos", "events": len(rows)}],
            "eventColumns": EVENT_COLUMNS,
            "stats": {
                "events": len(rows),
                "uniqueProtocols": len(rows),
                "municipalitiesWithEvents": 1,
            },
        }
        (root / "manifest.json").write_text(
            json.dumps(manifest), encoding="utf-8"
        )
        with gzip.open(root / "events" / "SC.json.gz", "wt", encoding="utf-8") as handle:
            json.dump({"columns": EVENT_COLUMNS, "rows": rows}, handle)
        with gzip.open(root / "atlas-summary.json.gz", "wt", encoding="utf-8") as handle:
            json.dump({"columns": [], "rows": rows}, handle)

    def build_report(self) -> Path:
        path = self.root / "build-report.json"
        path.write_text(
            json.dumps(
                {
                    "status": "ok",
                    "errors": 0,
                    "warnings": 2,
                    "fallbackDates": {},
                    "emptyNumericCells": {},
                }
            ),
            encoding="utf-8",
        )
        return path

    def test_release_metadata_is_safe_and_deterministic(self) -> None:
        metadata = release_metadata(parse_release_url(NEW_URL))
        self.assertEqual(
            metadata["branch"],
            "automation/atlas-2027-05-20-v1-0-1991-2026",
        )
        self.assertEqual(metadata["title"], "Dados — Atlas v1.0 — 20/05/2027")

    def test_additions_and_damage_corrections_are_approved(self) -> None:
        self.write_data(
            self.current,
            source_url=CURRENT_URL,
            rows=[self.event("P1", human_total=10)],
        )
        self.write_data(
            self.candidate,
            source_url=NEW_URL,
            rows=[self.event("P1", human_total=8), self.event("P2")],
        )

        report = compare_releases(
            self.current,
            self.candidate,
            build_report_path=self.build_report(),
        )

        self.assertEqual(report["status"], "approved")
        self.assertEqual(report["changes"]["addedRecords"], 1)
        self.assertEqual(report["changes"]["correctedRecords"], 1)
        self.assertEqual(report["errors"], [])
        self.assertIn("Aprovada para revisão", report_markdown(report))

    def test_missing_published_protocol_stops_the_update(self) -> None:
        self.write_data(
            self.current,
            source_url=CURRENT_URL,
            rows=[self.event("P1"), self.event("P2")],
        )
        self.write_data(
            self.candidate,
            source_url=NEW_URL,
            rows=[self.event("P2")],
        )

        report = compare_releases(self.current, self.candidate)

        self.assertEqual(report["status"], "rejected")
        self.assertEqual(report["changes"]["removedRecords"], 1)

    def test_identity_change_stops_but_damage_change_does_not(self) -> None:
        self.write_data(
            self.current,
            source_url=CURRENT_URL,
            rows=[self.event("P1")],
        )
        self.write_data(
            self.candidate,
            source_url=NEW_URL,
            rows=[self.event("P1", event_date="2025-02-01", human_total=5)],
        )

        report = compare_releases(self.current, self.candidate)

        self.assertEqual(report["status"], "rejected")
        self.assertEqual(report["changes"]["identityChanges"], 1)

    def test_readme_release_block_is_generated_from_data(self) -> None:
        self.write_data(
            self.candidate,
            source_url=NEW_URL,
            rows=[self.event("P1"), self.event("P2")],
        )
        geometry_dir = self.candidate / "geo"
        geometry_dir.mkdir()
        with gzip.open(
            geometry_dir / "municipios-br.geojson.gz", "wt", encoding="utf-8"
        ) as handle:
            json.dump({"features": [{}, {}, {}]}, handle)
        readme = self.root / "README.md"
        readme.write_text(
            f"# Teste\n\n{START_MARKER}\nantigo\n{END_MARKER}\n\nfim\n",
            encoding="utf-8",
        )

        sync_readme(readme, self.candidate)

        content = readme.read_text(encoding="utf-8")
        self.assertIn("dezembro de 2026", content)
        self.assertIn("**2 registros**", content)
        self.assertIn("**3 municípios e unidades equivalentes**", content)

        methodology = self.root / "metodologia.md"
        methodology.write_text(
            f"# Método\n\n{METHODOLOGY_START_MARKER}\nantigo\n"
            f"{METHODOLOGY_END_MARKER}\n\nfim\n",
            encoding="utf-8",
        )
        sync_methodology(methodology, self.candidate)
        method_content = methodology.read_text(encoding="utf-8")
        self.assertIn("| Registros de desastre | 2 |", method_content)
        self.assertIn("BD_Atlas_1991_2026_v1.0_2027.05.20_Consolidado.csv", method_content)


if __name__ == "__main__":
    unittest.main()
