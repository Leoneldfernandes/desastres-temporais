import unittest

from scripts.check_atlas_update import (
    AtlasCheckError,
    build_status,
    discover_latest_release,
    failure_status,
    parse_release_url,
)


CURRENT_URL = (
    "https://atlasdigital.mdr.gov.br/arquivos/2026/"
    "BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv"
)
NEW_URL = (
    "https://atlasdigital.mdr.gov.br/arquivos/2027/"
    "BD_Atlas_1991_2026_v1.0_2027.05.20_Consolidado.csv"
)
CHECKED_AT = "2026-08-31T11:00:00+00:00"


class AtlasUpdateCheckTests(unittest.TestCase):
    def manifest(self) -> dict[str, object]:
        return {"sourceUrl": CURRENT_URL}

    def test_latest_official_csv_is_discovered(self) -> None:
        html = f"""
        <a href="/arquivos/2025/BD_Atlas_1991_2024_v1.0_2025.05.20_Consolidado.csv">CSV anterior</a>
        <a href="{CURRENT_URL}">Ponto e Vírgula (CSV)</a>
        """
        release = discover_latest_release(html)
        self.assertEqual(release.url, CURRENT_URL)
        self.assertEqual(release.label, "v1.1 — 06/08/2026")
        self.assertEqual(release.end_year, 2025)

    def test_current_release_produces_up_to_date_status(self) -> None:
        status = build_status(
            self.manifest(), parse_release_url(CURRENT_URL), {}, CHECKED_AT
        )
        self.assertEqual(status["status"], "up-to-date")
        self.assertEqual(status["checkedAt"], CHECKED_AT)
        self.assertIsNone(status["availableVersion"])

    def test_new_release_produces_auditable_alert(self) -> None:
        status = build_status(
            self.manifest(), parse_release_url(NEW_URL), {}, CHECKED_AT
        )
        self.assertEqual(status["status"], "update-available")
        self.assertEqual(status["availableVersion"], "v1.0 — 20/05/2027")
        self.assertEqual(status["availableSourceUrl"], NEW_URL)
        self.assertEqual(status["detectedAt"], CHECKED_AT)

    def test_repeated_alert_preserves_first_detection(self) -> None:
        previous = {
            "status": "update-available",
            "availableSourceUrl": NEW_URL,
            "detectedAt": "2027-05-20T11:00:00+00:00",
        }
        status = build_status(
            self.manifest(), parse_release_url(NEW_URL), previous, CHECKED_AT
        )
        self.assertEqual(status["detectedAt"], previous["detectedAt"])

    def test_unofficial_or_older_release_is_rejected(self) -> None:
        with self.assertRaises(AtlasCheckError):
            parse_release_url(
                "https://example.org/arquivos/2027/"
                "BD_Atlas_1991_2026_v1.0_2027.05.20_Consolidado.csv"
            )

        with self.assertRaises(AtlasCheckError):
            parse_release_url(f"{CURRENT_URL}?arquivo=outro")

        with self.assertRaises(AtlasCheckError):
            parse_release_url(CURRENT_URL.replace(".gov.br/", ".gov.br:444/"))

        old = parse_release_url(
            "https://atlasdigital.mdr.gov.br/arquivos/2025/"
            "BD_Atlas_1991_2024_v1.0_2025.05.20_Consolidado.csv"
        )
        with self.assertRaises(AtlasCheckError):
            build_status(self.manifest(), old, {}, CHECKED_AT)

    def test_failure_preserves_last_successful_check(self) -> None:
        status = failure_status({"checkedAt": CHECKED_AT})
        self.assertEqual(status["status"], "check-failed")
        self.assertEqual(status["checkedAt"], CHECKED_AT)


if __name__ == "__main__":
    unittest.main()
