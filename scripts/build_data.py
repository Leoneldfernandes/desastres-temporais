#!/usr/bin/env python3
"""Prepara a base do Atlas para consumo rápido no navegador.

O CSV bruto não é publicado. Este script gera:
  - data/manifest.json
  - data/atlas-summary.json
  - data/events/<UF>.json

Somente a biblioteca padrão do Python é necessária.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


TYPE_COLORS = {
    "Alagamentos": "#00B8D9",
    "Chuvas Intensas": "#2979FF",
    "Doenças infecciosas": "#7E57C2",
    "Enxurradas": "#00ACC1",
    "Erosão": "#A1887F",
    "Estiagem e Seca": "#F9A825",
    "Granizo": "#B0BEC5",
    "Incêndio Florestal": "#E53935",
    "Inundações": "#1565C0",
    "Movimento de Massa": "#795548",
    "Onda de Calor e Baixa Umidade": "#FB8C00",
    "Onda de Frio": "#80DEEA",
    "Outros": "#78909C",
    "Rompimento/Colapso de barragens": "#D81B60",
    "Tornado": "#5E35B1",
    "Vendavais e Ciclones": "#00897B",
}

SUMMARY_COLUMNS = [
    "period",
    "municipalityCode",
    "type",
    "events",
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

DAMAGE_FIELDS = [
    "DH_total_danos_humanos_diretos",
    "DH_MORTOS",
    "DH_FERIDOS",
    "DH_ENFERMOS",
    "DH_DESABRIGADOS",
    "DH_DESALOJADOS",
    "DH_DESAPARECIDOS",
    "DH_AFETADOS_SECA_ESTIAGEM",
    "DH_OUTROS AFETADOS",
    "PEPL_total_publico",
    "PEPR_total_privado",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", required=True, type=Path)
    parser.add_argument("--output", default=Path("data"), type=Path)
    parser.add_argument(
        "--source-url",
        default=(
            "https://atlasdigital.mdr.gov.br/arquivos/2026/"
            "BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv"
        ),
    )
    parser.add_argument("--version", default="v1.1 — 06/08/2026")
    return parser.parse_args()


def parse_number(value: str | None, *, integer: bool = False) -> int | float:
    text = (value or "").strip()
    if not text:
        return 0
    try:
        number = float(text.replace(" ", "").replace(",", "."))
    except ValueError:
        return 0
    if integer:
        return int(round(number))
    return round(number, 2)


def parse_date(value: str, protocol: str) -> tuple[str, str]:
    text = (value or "").strip()
    try:
        parsed = datetime.strptime(text, "%d/%m/%Y")
        return parsed.strftime("%Y-%m-%d"), parsed.strftime("%Y-%m")
    except ValueError:
        suffix = protocol.rsplit("-", 1)[-1]
        if len(suffix) == 8 and suffix.isdigit():
            parsed = datetime.strptime(suffix, "%Y%m%d")
            return parsed.strftime("%Y-%m-%d"), parsed.strftime("%Y-%m")
        raise ValueError(f"Data inválida: {text!r} ({protocol})")


def all_months(start: str, end: str) -> list[str]:
    year, month = map(int, start.split("-"))
    end_year, end_month = map(int, end.split("-"))
    result: list[str] = []
    while (year, month) <= (end_year, end_month):
        result.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year += 1
            month = 1
    return result


def dump_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )


def main() -> None:
    args = parse_args()
    output = args.output
    event_dir = output / "events"
    event_dir.mkdir(parents=True, exist_ok=True)
    for stale_file in event_dir.glob("*.json"):
        stale_file.unlink()

    type_counts: Counter[str] = Counter()
    uf_counts: Counter[str] = Counter()
    municipality_names: dict[str, tuple[str, str]] = {}
    protocols: set[str] = set()
    parsed_rows: list[dict[str, object]] = []
    min_period = "9999-99"
    max_period = "0000-00"

    with args.atlas.open("r", encoding="iso-8859-1", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        missing = [name for name in DAMAGE_FIELDS if name not in (reader.fieldnames or [])]
        if missing:
            raise RuntimeError(f"Colunas ausentes no Atlas: {', '.join(missing)}")

        for source in reader:
            protocol = (source.get("Protocolo_S2iD") or "").strip()
            if not protocol or protocol in protocols:
                raise RuntimeError(f"Protocolo ausente ou duplicado: {protocol!r}")
            protocols.add(protocol)

            uf = (source.get("Sigla_UF") or "").strip().upper()
            code = (source.get("Cod_IBGE_Mun") or "").strip()
            name = (source.get("Nome_Municipio") or "").strip()
            disaster_type = (source.get("descricao_tipologia") or "Outros").strip()
            event_date, period = parse_date(source.get("Data_Evento") or "", protocol)
            registration_date, _ = parse_date(
                source.get("Data_Registro") or source.get("Data_Evento") or "", protocol
            )

            min_period = min(min_period, period)
            max_period = max(max_period, period)
            type_counts[disaster_type] += 1
            uf_counts[uf] += 1
            municipality_names[code] = (name, uf)

            damages = [
                parse_number(source.get("DH_total_danos_humanos_diretos"), integer=True),
                parse_number(source.get("DH_MORTOS"), integer=True),
                parse_number(source.get("DH_FERIDOS"), integer=True),
                parse_number(source.get("DH_ENFERMOS"), integer=True),
                parse_number(source.get("DH_DESABRIGADOS"), integer=True),
                parse_number(source.get("DH_DESALOJADOS"), integer=True),
                parse_number(source.get("DH_DESAPARECIDOS"), integer=True),
                parse_number(source.get("DH_AFETADOS_SECA_ESTIAGEM"), integer=True),
                parse_number(source.get("DH_OUTROS AFETADOS"), integer=True),
                parse_number(source.get("PEPL_total_publico")),
                parse_number(source.get("PEPR_total_privado")),
            ]
            parsed_rows.append(
                {
                    "uf": uf,
                    "code": code,
                    "name": name,
                    "type": disaster_type,
                    "protocol": protocol,
                    "eventDate": event_date,
                    "registrationDate": registration_date,
                    "period": period,
                    "damages": damages,
                }
            )

    official_types = list(TYPE_COLORS)
    unknown_types = sorted(set(type_counts) - set(official_types))
    missing_types = sorted(set(official_types) - set(type_counts))
    if unknown_types or missing_types:
        raise RuntimeError(
            f"Tipologias divergentes. Novas={unknown_types}; ausentes={missing_types}"
        )

    periods = all_months(min_period, max_period)
    period_index = {period: index for index, period in enumerate(periods)}
    type_index = {name: index for index, name in enumerate(official_types)}

    # period, code, type -> events + damage sums
    summary: dict[tuple[int, str, int], list[int | float]] = defaultdict(
        lambda: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    )
    events_by_uf: dict[str, list[list[object]]] = defaultdict(list)

    for row in parsed_rows:
        p_idx = period_index[str(row["period"])]
        t_idx = type_index[str(row["type"])]
        code = str(row["code"])
        values = list(row["damages"])
        bucket = summary[(p_idx, code, t_idx)]
        bucket[0] += 1
        for idx, value in enumerate(values, start=1):
            bucket[idx] += value

        events_by_uf[str(row["uf"])].append(
            [
                p_idx,
                code,
                t_idx,
                row["protocol"],
                row["eventDate"],
                row["registrationDate"],
                *values,
            ]
        )

    summary_rows = [
        [p_idx, code, t_idx, *values]
        for (p_idx, code, t_idx), values in sorted(summary.items())
    ]
    dump_json(output / "atlas-summary.json", {"columns": SUMMARY_COLUMNS, "rows": summary_rows})

    for uf, rows in sorted(events_by_uf.items()):
        rows.sort(key=lambda item: (item[0], item[1], item[2], item[3]))
        dump_json(event_dir / f"{uf}.json", {"columns": EVENT_COLUMNS, "rows": rows})

    manifest = {
        "title": "Atlas Espaço-Temporal de Desastres",
        "version": args.version,
        "sourceUrl": args.source_url,
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "periods": periods,
        "types": [
            {
                "id": index,
                "name": name,
                "color": TYPE_COLORS[name],
                "events": type_counts[name],
            }
            for index, name in enumerate(official_types)
        ],
        "summaryColumns": SUMMARY_COLUMNS,
        "eventColumns": EVENT_COLUMNS,
        "files": {
            "summary": "data/atlas-summary.json",
            "nationalGeometry": "data/geo/municipios-br.geojson",
            "stateGeometryPattern": "data/geo/uf/{UF}.json",
            "stateEventsPattern": "data/events/{UF}.json",
        },
        "stats": {
            "events": len(parsed_rows),
            "uniqueProtocols": len(protocols),
            "municipalitiesWithEvents": len(municipality_names),
            "periods": len(periods),
            "types": len(official_types),
            "eventsByUf": dict(sorted(uf_counts.items())),
        },
    }
    dump_json(output / "manifest.json", manifest)

    print(
        json.dumps(
            {
                "events": len(parsed_rows),
                "summaryRows": len(summary_rows),
                "periods": len(periods),
                "types": len(official_types),
                "states": len(events_by_uf),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
