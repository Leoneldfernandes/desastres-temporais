#!/usr/bin/env python3
"""Valida as invariantes dos arquivos publicados pelo site."""

from __future__ import annotations

import argparse
import gzip
import json
from datetime import date
from pathlib import Path


CURRENT_RELEASE = {
    "events": 76_190,
    "summaryRows": 73_744,
    "periods": 420,
    "types": 16,
    "municipalities": 5_573,
    "scEvents": 9_108,
}


def load(path: Path) -> object:
    if path.suffix == ".gz":
        handle = gzip.open(path, mode="rt", encoding="utf-8")
    else:
        handle = path.open(encoding="utf-8")
    with handle:
        return json.load(handle)


def next_period(period: str) -> str:
    year, month = map(int, period.split("-"))
    if month == 12:
        return f"{year + 1:04d}-01"
    return f"{year:04d}-{month + 1:02d}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data"))
    parser.add_argument(
        "--strict-current",
        action="store_true",
        help="Também confere as contagens exatas da base v1.1 de 06/08/2026.",
    )
    args = parser.parse_args()

    manifest = load(args.data / "manifest.json")
    summary = load(args.data / manifest["files"]["summary"].removeprefix("data/"))
    geometry = load(
        args.data / manifest["files"]["nationalGeometry"].removeprefix("data/")
    )

    assert isinstance(manifest, dict)
    assert isinstance(summary, dict)
    assert isinstance(geometry, dict)

    stats = manifest["stats"]
    periods = manifest["periods"]
    types = manifest["types"]
    rows = summary["rows"]
    features = geometry["features"]

    assert stats["events"] == stats["uniqueProtocols"]
    assert stats["periods"] == len(periods)
    assert stats["types"] == len(types) == 16
    assert len(set(periods)) == len(periods)
    assert all(next_period(current) == following for current, following in zip(periods, periods[1:]))
    assert len(summary["columns"]) == 15
    assert all(len(row) == len(summary["columns"]) for row in rows)
    assert all(0 <= row[0] < len(periods) for row in rows)
    assert all(0 <= row[2] < len(types) for row in rows)

    geometry_codes = {str(feature["properties"]["cd"]) for feature in features}
    summary_codes = {str(row[1]) for row in rows}
    assert len(geometry_codes) == len(features)
    assert summary_codes <= geometry_codes

    uf_files = sorted((args.data / "events").glob("*.json.gz"))
    state_geo_files = sorted((args.data / "geo" / "uf").glob("*.json.gz"))
    assert len(uf_files) == 27, len(uf_files)
    assert len(state_geo_files) == 27, len(state_geo_files)

    event_count = 0
    events_by_uf: dict[str, int] = {}
    for path in uf_files:
        payload = load(path)
        assert isinstance(payload, dict)
        assert len(payload["columns"]) == 17
        assert all(len(row) == len(payload["columns"]) for row in payload["rows"])
        uf = path.name.removesuffix(".json.gz")
        events_by_uf[uf] = len(payload["rows"])
        event_count += len(payload["rows"])
    assert event_count == stats["events"]
    assert events_by_uf == stats["eventsByUf"]

    assert date.fromisoformat(manifest["generatedAt"][:10])

    if args.strict_current:
        assert stats["events"] == CURRENT_RELEASE["events"]
        assert len(rows) == CURRENT_RELEASE["summaryRows"]
        assert len(periods) == CURRENT_RELEASE["periods"]
        assert periods[0] == "1991-01" and periods[-1] == "2025-12"
        assert len(types) == CURRENT_RELEASE["types"]
        assert len(features) == CURRENT_RELEASE["municipalities"]
        assert events_by_uf["SC"] == CURRENT_RELEASE["scEvents"]
        july_1991 = periods.index("1991-07")
        assert not any(row[0] == july_1991 for row in rows)

    print(
        json.dumps(
            {
                "status": "ok",
                "events": stats["events"],
                "periods": len(periods),
                "types": len(types),
                "municipalities": len(features),
                "summaryRows": len(rows),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
