#!/usr/bin/env python3
"""Consulta a página oficial do Atlas e produz o estado público da verificação."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen


DOWNLOADS_URL = "https://atlasdigital.mdr.gov.br/paginas/downloads.xhtml"
OFFICIAL_HOST = "atlasdigital.mdr.gov.br"
MAX_PAGE_BYTES = 2_000_000
CSV_PATH_PATTERN = re.compile(
    r"^/arquivos/(?P<folder>\d{4})/"
    r"BD_Atlas_(?P<start>\d{4})_(?P<end>\d{4})_"
    r"v(?P<version>\d+(?:\.\d+)*)_"
    r"(?P<year>\d{4})\.(?P<month>\d{2})\.(?P<day>\d{2})_"
    r"Consolidado\.csv$",
    re.IGNORECASE,
)


class AtlasCheckError(RuntimeError):
    """Indica que a fonte oficial não pôde ser interpretada com segurança."""


@dataclass(frozen=True)
class AtlasRelease:
    url: str
    start_year: int
    end_year: int
    version: str
    released_on: date

    @property
    def label(self) -> str:
        return f"v{self.version} — {self.released_on:%d/%m/%Y}"

    @property
    def order(self) -> tuple[date, tuple[int, ...], int]:
        version_numbers = tuple(int(part) for part in self.version.split("."))
        return self.released_on, version_numbers, self.end_year


class LinkParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.links: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if href:
            self.links.append(urljoin(self.base_url, href))


def parse_release_url(url: str) -> AtlasRelease:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.hostname != OFFICIAL_HOST:
        raise AtlasCheckError("O CSV encontrado não pertence ao domínio oficial do Atlas.")

    match = CSV_PATH_PATTERN.fullmatch(parsed.path)
    if not match:
        raise AtlasCheckError("O nome do CSV oficial não segue o padrão auditável esperado.")

    released_on = date(
        int(match["year"]), int(match["month"]), int(match["day"])
    )
    if int(match["folder"]) != released_on.year:
        raise AtlasCheckError("A pasta do CSV não corresponde ao ano de publicação.")

    return AtlasRelease(
        url=url,
        start_year=int(match["start"]),
        end_year=int(match["end"]),
        version=match["version"],
        released_on=released_on,
    )


def discover_latest_release(html: str, base_url: str = DOWNLOADS_URL) -> AtlasRelease:
    parser = LinkParser(base_url)
    parser.feed(html)
    releases: list[AtlasRelease] = []

    for link in parser.links:
        if not urlsplit(link).path.lower().endswith(".csv"):
            continue
        try:
            releases.append(parse_release_url(link))
        except AtlasCheckError:
            continue

    if not releases:
        raise AtlasCheckError("Nenhum CSV oficial reconhecível foi encontrado na página.")
    return max(releases, key=lambda release: release.order)


def fetch_downloads_page(url: str = DOWNLOADS_URL, timeout: int = 30) -> str:
    request = Request(
        url,
        headers={
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "desastres-temporais-atlas-check/1.0",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        final_url = response.geturl()
        parsed = urlsplit(final_url)
        if parsed.scheme != "https" or parsed.hostname != OFFICIAL_HOST:
            raise AtlasCheckError("A página de downloads redirecionou para outro domínio.")
        raw = response.read(MAX_PAGE_BYTES + 1)
        if len(raw) > MAX_PAGE_BYTES:
            raise AtlasCheckError("A página de downloads excedeu o limite de segurança.")
        encoding = response.headers.get_content_charset() or "utf-8"
        return raw.decode(encoding, errors="strict")


def load_json(path: Path) -> dict[str, object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise AtlasCheckError(f"{path} não contém um objeto JSON.")
    return payload


def build_status(
    manifest: dict[str, object],
    latest: AtlasRelease,
    previous: dict[str, object],
    checked_at: str,
) -> dict[str, object]:
    published_url = str(manifest.get("sourceUrl", ""))
    if latest.url == published_url:
        return {
            "schemaVersion": 1,
            "status": "up-to-date",
            "checkedAt": checked_at,
            "availableVersion": None,
            "availableSourceUrl": None,
            "detectedAt": None,
        }

    published = parse_release_url(published_url)
    if latest.order < published.order:
        raise AtlasCheckError("A página oficial anunciou uma versão anterior à publicada.")

    detected_at = checked_at
    if (
        previous.get("status") == "update-available"
        and previous.get("availableSourceUrl") == latest.url
        and previous.get("detectedAt")
    ):
        detected_at = str(previous["detectedAt"])

    return {
        "schemaVersion": 1,
        "status": "update-available",
        "checkedAt": checked_at,
        "availableVersion": latest.label,
        "availableSourceUrl": latest.url,
        "detectedAt": detected_at,
    }


def failure_status(previous: dict[str, object]) -> dict[str, object]:
    checked_at = previous.get("checkedAt")
    return {
        "schemaVersion": 1,
        "status": "check-failed",
        "checkedAt": checked_at if isinstance(checked_at, str) else None,
        "availableVersion": None,
        "availableSourceUrl": None,
        "detectedAt": None,
    }


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("data/manifest.json"))
    parser.add_argument(
        "--previous-status", type=Path, default=Path("data/update-status.json")
    )
    parser.add_argument("--output", type=Path)
    parser.add_argument("--downloads-url", default=DOWNLOADS_URL)
    args = parser.parse_args()

    previous = load_json(args.previous_status)
    checked_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    try:
        html = fetch_downloads_page(args.downloads_url)
        latest = discover_latest_release(html, args.downloads_url)
        status = build_status(load_json(args.manifest), latest, previous, checked_at)
    except Exception as error:
        status = failure_status(previous)
        if args.output:
            write_json(args.output, status)
        print(f"Falha na verificação do Atlas: {error}", file=sys.stderr)
        return 1

    if args.output:
        write_json(args.output, status)
    print(json.dumps(status, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
