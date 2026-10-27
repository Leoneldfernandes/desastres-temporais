#!/usr/bin/env python3
"""Sincroniza no README os números auditáveis da versão publicada."""

from __future__ import annotations

import argparse
import gzip
import json
from pathlib import Path
from urllib.parse import urlsplit

try:
    from scripts.check_atlas_update import parse_release_url
except ModuleNotFoundError:  # Permite executar diretamente: python scripts/...
    from check_atlas_update import parse_release_url


START_MARKER = "<!-- atlas-release:start -->"
END_MARKER = "<!-- atlas-release:end -->"
METHODOLOGY_START_MARKER = "<!-- atlas-methodology-release:start -->"
METHODOLOGY_END_MARKER = "<!-- atlas-methodology-release:end -->"
MONTHS = (
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
)


def load_json(path: Path) -> object:
    if path.suffix == ".gz":
        handle = gzip.open(path, mode="rt", encoding="utf-8")
    else:
        handle = path.open(encoding="utf-8")
    with handle:
        return json.load(handle)


def period_long(period: str) -> str:
    year, month = map(int, period.split("-"))
    return f"{MONTHS[month - 1]} de {year}"


def pt_integer(value: int) -> str:
    return f"{value:,}".replace(",", ".")


def release_block(data: Path) -> str:
    manifest = load_json(data / "manifest.json")
    geometry_path = data / "geo" / "municipios-br.geojson.gz"
    geometry = load_json(geometry_path)
    if not isinstance(manifest, dict) or not isinstance(geometry, dict):
        raise ValueError("Manifesto ou geometria inválidos.")

    release = parse_release_url(str(manifest["sourceUrl"]))
    periods = manifest["periods"]
    stats = manifest["stats"]
    features = geometry["features"]
    if manifest["version"] != release.label:
        raise ValueError("A versão do manifesto diverge do CSV oficial.")

    return "\n".join(
        [
            START_MARKER,
            (
                "Mapa espaço-temporal dos registros oficiais de desastres no Brasil, "
                f"com cobertura nacional e todos os meses de {period_long(periods[0])} "
                f"a {period_long(periods[-1])}."
            ),
            "",
            "## Cobertura e metodologia",
            "",
            (
                f"A versão publicada usa a base consolidada {release.label.split(' — ')[0]} "
                "do Atlas Digital de Desastres no Brasil, de "
                f"{release.released_on:%d/%m/%Y}. São **{pt_integer(stats['events'])} "
                f"registros**, **{pt_integer(len(periods))} meses contínuos**, "
                f"**{pt_integer(len(manifest['types']))} tipologias oficiais** e "
                f"**{pt_integer(len(features))} municípios e unidades equivalentes** "
                "na malha cartográfica."
            ),
            END_MARKER,
        ]
    )


def methodology_block(data: Path) -> str:
    manifest = load_json(data / "manifest.json")
    geometry = load_json(data / "geo" / "municipios-br.geojson.gz")
    summary = load_json(data / "atlas-summary.json.gz")
    if not all(isinstance(item, dict) for item in (manifest, geometry, summary)):
        raise ValueError("Manifesto, geometria ou resumo inválidos.")

    release = parse_release_url(str(manifest["sourceUrl"]))
    periods = manifest["periods"]
    stats = manifest["stats"]
    filename = Path(urlsplit(release.url).path).name
    return "\n".join(
        [
            METHODOLOGY_START_MARKER,
            "Esta documentação descreve a versão atualmente publicada:",
            "",
            "| Item | Cobertura |",
            "| --- | ---: |",
            f"| Versão da fonte | {release.label} |",
            f"| Período | {period_long(periods[0])} a {period_long(periods[-1])} |",
            f"| Meses na sequência temporal | {pt_integer(len(periods))} |",
            f"| Registros de desastre | {pt_integer(stats['events'])} |",
            f"| Protocolos S2iD únicos | {pt_integer(stats['uniqueProtocols'])} |",
            f"| Tipologias | {pt_integer(len(manifest['types']))} |",
            (
                "| Códigos territoriais com registros | "
                f"{pt_integer(stats['municipalitiesWithEvents'])} |"
            ),
            f"| Feições na malha | {pt_integer(len(geometry['features']))} |",
            f"| Linhas do resumo derivado | {pt_integer(len(summary['rows']))} |",
            "",
            "O CSV bruto não é publicado no repositório. O site usa somente artefatos derivados e compactados, produzidos pelo processo descrito abaixo.",
            "",
            "## 2. Fontes e proveniência",
            "",
            "### 2.1. Registros de desastres",
            "",
            "- Fonte institucional: [Atlas Digital de Desastres no Brasil](https://atlasdigital.mdr.gov.br/), Sedec/MIDR.",
            f"- Arquivo processado: `{filename}`.",
            f"- Endereço registrado no processamento: <{release.url}>.",
            "- Codificação e separador esperados: ISO-8859-1 e ponto e vírgula.",
            METHODOLOGY_END_MARKER,
        ]
    )


def sync_marked_file(
    path: Path, start_marker: str, end_marker: str, block: str
) -> None:
    content = path.read_text(encoding="utf-8")
    start = content.find(start_marker)
    end = content.find(end_marker)
    if start < 0 or end < start:
        raise ValueError(f"Marcadores da versão publicada não encontrados em {path}.")
    end += len(end_marker)
    updated = content[:start] + block + content[end:]
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(updated, encoding="utf-8")
    temporary.replace(path)


def sync_readme(readme: Path, data: Path) -> None:
    sync_marked_file(
        readme,
        START_MARKER,
        END_MARKER,
        release_block(data),
    )


def sync_methodology(methodology: Path, data: Path) -> None:
    sync_marked_file(
        methodology,
        METHODOLOGY_START_MARKER,
        METHODOLOGY_END_MARKER,
        methodology_block(data),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data"))
    parser.add_argument("--readme", type=Path, default=Path("README.md"))
    parser.add_argument(
        "--methodology", type=Path, default=Path("docs/metodologia.md")
    )
    args = parser.parse_args()
    sync_readme(args.readme, args.data)
    sync_methodology(args.methodology, args.data)


if __name__ == "__main__":
    main()
