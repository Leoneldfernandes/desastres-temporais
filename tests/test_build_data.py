from __future__ import annotations

import csv
import gzip
import json
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

from scripts import build_data


class BuildDataTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.atlas = self.root / "atlas.csv"
        self.output = self.root / "data"
        self.report = self.root / "build-report.json"

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def args(self) -> Namespace:
        return Namespace(
            atlas=self.atlas,
            output=self.output,
            report=self.report,
            source_url="https://example.test/atlas.csv",
            version="teste",
        )

    def valid_rows(self) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        for index, disaster_type in enumerate(build_data.TYPE_COLORS):
            row = {field: "" for field in build_data.REQUIRED_FIELDS}
            row.update(
                {
                    "Protocolo_S2iD": f"SC-TESTE-{index:02d}-20200101",
                    "Sigla_UF": "SC",
                    "Cod_IBGE_Mun": "4205407",
                    "Nome_Municipio": "Florianópolis",
                    "descricao_tipologia": disaster_type,
                    "Data_Evento": "01/01/2020",
                    "Data_Registro": "02/01/2020",
                }
            )
            rows.append(row)
        return rows

    def write_rows(
        self,
        rows: list[dict[str, str]],
        *,
        fieldnames: list[str] | None = None,
    ) -> None:
        columns = fieldnames or build_data.REQUIRED_FIELDS
        with self.atlas.open("w", encoding="iso-8859-1", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns, delimiter=";")
            writer.writeheader()
            writer.writerows(rows)

    def test_valid_source_is_built_and_auditable(self) -> None:
        rows = self.valid_rows()
        rows[0]["DH_MORTOS"] = "2"
        rows[0]["PEPL_total_publico"] = "123,45"
        self.write_rows(rows)

        result = build_data.build(self.args())

        self.assertEqual(result["events"], len(build_data.TYPE_COLORS))
        self.assertTrue((self.output / "atlas-summary.json.gz").is_file())
        self.assertTrue((self.output / "events" / "SC.json.gz").is_file())
        with gzip.open(
            self.output / "events" / "SC.json.gz", "rt", encoding="utf-8"
        ) as handle:
            events = json.load(handle)
        self.assertEqual(events["rows"][0][7], 2)
        self.assertEqual(events["rows"][0][-2], 123.45)

        manifest = json.loads(
            (self.output / "manifest.json").read_text(encoding="utf-8")
        )
        report = json.loads(self.report.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "ok")
        self.assertEqual(report["errors"], 0)
        self.assertEqual(report["sourceUrl"], self.args().source_url)
        self.assertEqual(report["version"], self.args().version)
        self.assertEqual(manifest["sourceSha256"], report["sourceSha256"])

    def test_invalid_number_stops_build_and_preserves_published_files(self) -> None:
        rows = self.valid_rows()
        rows[0]["DH_MORTOS"] = "não informado"
        self.write_rows(rows)

        event_dir = self.output / "events"
        event_dir.mkdir(parents=True)
        (event_dir / "sentinel.txt").write_text("original", encoding="utf-8")
        (self.output / "manifest.json").write_text("original", encoding="utf-8")
        (self.output / "atlas-summary.json.gz").write_bytes(b"original")

        with self.assertRaises(build_data.AtlasValidationError):
            build_data.build(self.args())

        self.assertEqual(
            (event_dir / "sentinel.txt").read_text(encoding="utf-8"), "original"
        )
        self.assertEqual(
            (self.output / "manifest.json").read_text(encoding="utf-8"), "original"
        )
        self.assertEqual(
            (self.output / "atlas-summary.json.gz").read_bytes(), b"original"
        )
        report = json.loads(self.report.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "failed")
        self.assertTrue(
            any(issue["code"] == "invalid_number" for issue in report["issues"])
        )

    def test_fractional_or_negative_counts_are_rejected(self) -> None:
        rows = self.valid_rows()
        rows[0]["DH_MORTOS"] = "1,5"
        rows[1]["DH_FERIDOS"] = "-1"
        self.write_rows(rows)

        with self.assertRaises(build_data.AtlasValidationError):
            build_data.build(self.args())

        report = json.loads(self.report.read_text(encoding="utf-8"))
        codes = {issue["code"] for issue in report["issues"]}
        self.assertIn("fractional_count", codes)
        self.assertIn("negative_number", codes)

    def test_missing_required_column_is_reported(self) -> None:
        rows = self.valid_rows()
        columns = [
            field for field in build_data.REQUIRED_FIELDS if field != "DH_MORTOS"
        ]
        trimmed = [{key: value for key, value in row.items() if key in columns} for row in rows]
        self.write_rows(trimmed, fieldnames=columns)

        with self.assertRaises(build_data.AtlasValidationError):
            build_data.build(self.args())

        report = json.loads(self.report.read_text(encoding="utf-8"))
        self.assertTrue(
            any(
                issue["code"] == "missing_column"
                and issue["field"] == "DH_MORTOS"
                for issue in report["issues"]
            )
        )

    def test_registration_before_event_is_preserved_as_warning(self) -> None:
        rows = self.valid_rows()
        rows[0]["Data_Evento"] = "02/01/2020"
        rows[0]["Data_Registro"] = "01/01/2020"
        self.write_rows(rows)

        result = build_data.build(self.args())

        self.assertEqual(result["events"], len(build_data.TYPE_COLORS))
        report = json.loads(self.report.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "ok")
        self.assertTrue(
            any(
                issue["code"] == "registration_before_event"
                and issue["severity"] == "warning"
                for issue in report["issues"]
            )
        )

    def test_name_variant_for_same_ibge_code_is_audited_as_warning(self) -> None:
        rows = self.valid_rows()
        rows[1]["Nome_Municipio"] = "Florianopolis"
        self.write_rows(rows)

        result = build_data.build(self.args())

        self.assertEqual(result["events"], len(build_data.TYPE_COLORS))
        report = json.loads(self.report.read_text(encoding="utf-8"))
        self.assertEqual(report["status"], "ok")
        self.assertTrue(
            any(
                issue["code"] == "municipality_name_variant"
                and issue["severity"] == "warning"
                for issue in report["issues"]
            )
        )

    def test_duplicate_protocol_and_uf_mismatch_are_rejected(self) -> None:
        rows = self.valid_rows()
        rows[1]["Protocolo_S2iD"] = rows[0]["Protocolo_S2iD"]
        rows[2]["Sigla_UF"] = "SP"
        self.write_rows(rows)

        with self.assertRaises(build_data.AtlasValidationError):
            build_data.build(self.args())

        report = json.loads(self.report.read_text(encoding="utf-8"))
        codes = {issue["code"] for issue in report["issues"]}
        self.assertIn("duplicate_protocol", codes)
        self.assertIn("municipality_uf_mismatch", codes)


if __name__ == "__main__":
    unittest.main()
