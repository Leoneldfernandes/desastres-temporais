import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_build import validate_update_status


class UpdateStatusTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.data = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_status(self, **changes: object) -> None:
        payload = {
            "schemaVersion": 1,
            "status": "awaiting-first-check",
            "checkedAt": None,
            "availableVersion": None,
            "availableSourceUrl": None,
            "detectedAt": None,
        }
        payload.update(changes)
        (self.data / "update-status.json").write_text(
            json.dumps(payload), encoding="utf-8"
        )

    def test_initial_status_is_valid(self) -> None:
        self.write_status()
        validate_update_status(self.data)

    def test_completed_checks_require_timestamp(self) -> None:
        self.write_status(status="up-to-date")
        with self.assertRaises(AssertionError):
            validate_update_status(self.data)

        self.write_status(
            status="update-available",
            availableVersion="v1.2 — 24/08/2026",
            availableSourceUrl="https://atlasdigital.mdr.gov.br/nova-base.csv",
            detectedAt="2026-08-24T11:00:00+00:00",
        )
        with self.assertRaises(AssertionError):
            validate_update_status(self.data)

    def test_available_update_requires_auditable_metadata(self) -> None:
        self.write_status(status="update-available")
        with self.assertRaises(AssertionError):
            validate_update_status(self.data)

        self.write_status(
            status="update-available",
            checkedAt="2026-08-24T11:00:00+00:00",
            availableVersion="v1.2 — 24/08/2026",
            availableSourceUrl="https://atlasdigital.mdr.gov.br/nova-base.csv",
            detectedAt="2026-08-24T11:00:00+00:00",
        )
        validate_update_status(self.data)

    def test_unknown_status_is_rejected(self) -> None:
        self.write_status(status="resultado-inventado")
        with self.assertRaises(AssertionError):
            validate_update_status(self.data)


if __name__ == "__main__":
    unittest.main()
