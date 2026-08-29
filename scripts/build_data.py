#!/usr/bin/env python3
"""Valida e prepara a base do Atlas para consumo rápido no navegador.

O CSV bruto não é publicado. Este script gera arquivos JSON compactados:
  - data/manifest.json
  - data/atlas-summary.json.gz
  - data/events/<UF>.json.gz

A publicação só ocorre depois que toda a fonte passa pela validação. Em caso de
erro, os arquivos já publicados permanecem intactos e um relatório é gravado.
Somente a biblioteca padrão do Python é necessária.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import shutil
import sys
import tempfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import NoReturn


TYPE_COLORS = {
    "Alagamentos": "#00B8D9",
    "Chuvas Intensas": "#2979FF",
    "Doenças infecciosas": "#D45A9B",
    "Enxurradas": "#B2B250",
    "Erosão": "#A1887F",
    "Estiagem e Seca": "#F9A825",
    "Granizo": "#B0BEC5",
    "Incêndio Florestal": "#C62828",
    "Inundações": "#005B96",
    "Movimento de Massa": "#A96B3B",
    "Onda de Calor e Baixa Umidade": "#D95F02",
    "Onda de Frio": "#80DEEA",
    "Outros": "#4B5563",
    "Rompimento/Colapso de barragens": "#8E245A",
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

INTEGER_DAMAGE_FIELDS = set(DAMAGE_FIELDS[:9])
IDENTIFICATION_FIELDS = [
    "Protocolo_S2iD",
    "Sigla_UF",
    "Cod_IBGE_Mun",
    "Nome_Municipio",
    "descricao_tipologia",
    "Data_Evento",
    "Data_Registro",
]
REQUIRED_FIELDS = IDENTIFICATION_FIELDS + DAMAGE_FIELDS

UF_CODE_PREFIX = {
    "RO": "11",
    "AC": "12",
    "AM": "13",
    "RR": "14",
    "PA": "15",
    "AP": "16",
    "TO": "17",
    "MA": "21",
    "PI": "22",
    "CE": "23",
    "RN": "24",
    "PB": "25",
    "PE": "26",
    "AL": "27",
    "SE": "28",
    "BA": "29",
    "MG": "31",
    "ES": "32",
    "RJ": "33",
    "SP": "35",
    "PR": "41",
    "SC": "42",
    "RS": "43",
    "MS": "50",
    "MT": "51",
    "GO": "52",
    "DF": "53",
}

MAX_REPORTED_ISSUES = 200


class AtlasValidationError(RuntimeError):
    """Indica que a fonte não pode ser publicada com segurança."""


@dataclass
class ValidationReport:
    source: str
    source_sha256: str
    source_url: str
    version: str
    started_at: str
    rows_read: int = 0
    rows_accepted: int = 0
    errors: int = 0
    warnings: int = 0
    omitted_issues: int = 0
    empty_numeric_cells: Counter[str] = field(default_factory=Counter)
    fallback_dates: Counter[str] = field(default_factory=Counter)
    issues: list[dict[str, object]] = field(default_factory=list)

    def add_issue(
        self,
        severity: str,
        code: str,
        message: str,
        *,
        row: int | None = None,
        protocol: str | None = None,
        field_name: str | None = None,
        value: str | None = None,
    ) -> None:
        if severity == "error":
            self.errors += 1
        else:
            self.warnings += 1

        issue: dict[str, object] = {
            "severity": severity,
            "code": code,
            "message": message,
        }
        if row is not None:
            issue["row"] = row
        if protocol:
            issue["protocol"] = protocol
        if field_name:
            issue["field"] = field_name
        if value is not None:
            issue["value"] = value

        if len(self.issues) < MAX_REPORTED_ISSUES:
            self.issues.append(issue)
        else:
            self.omitted_issues += 1

    def error(self, code: str, message: str, **details: object) -> None:
        self.add_issue("error", code, message, **details)

    def warning(self, code: str, message: str, **details: object) -> None:
        self.add_issue("warning", code, message, **details)

    def as_dict(self, *, status: str) -> dict[str, object]:
        return {
            "status": status,
            "source": self.source,
            "sourceSha256": self.source_sha256,
            "sourceUrl": self.source_url,
            "version": self.version,
            "startedAt": self.started_at,
            "finishedAt": now_utc(),
            "rowsRead": self.rows_read,
            "rowsAccepted": self.rows_accepted,
            "errors": self.errors,
            "warnings": self.warnings,
            "emptyNumericCells": dict(sorted(self.empty_numeric_cells.items())),
            "fallbackDates": dict(sorted(self.fallback_dates.items())),
            "issues": self.issues,
            "omittedIssues": self.omitted_issues,
        }


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", required=True, type=Path)
    parser.add_argument("--output", default=Path("data"), type=Path)
    parser.add_argument("--report", default=Path("build-report.json"), type=Path)
    parser.add_argument(
        "--source-url",
        required=True,
        help="Endereço oficial exato do CSV usado na geração.",
    )
    parser.add_argument(
        "--version",
        required=True,
        help="Versão e data auditáveis, por exemplo: v1.1 — 06/08/2026.",
    )
    return parser.parse_args()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_report(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def parse_number(
    value: str | None,
    *,
    integer: bool,
    field_name: str,
    row_number: int,
    protocol: str,
    report: ValidationReport,
) -> int | float | None:
    raw = (value or "").strip()
    if not raw:
        report.empty_numeric_cells[field_name] += 1
        return 0

    normalized = raw.replace("\u00a0", "").replace(" ", "").replace("R$", "")
    if normalized.count(",") + normalized.count(".") > 1:
        report.error(
            "ambiguous_number",
            "Número com separadores ambíguos.",
            row=row_number,
            protocol=protocol,
            field_name=field_name,
            value=raw,
        )
        return None

    normalized = normalized.replace(",", ".")
    try:
        number = Decimal(normalized)
    except InvalidOperation:
        report.error(
            "invalid_number",
            "Valor numérico inválido; ele não foi convertido silenciosamente em zero.",
            row=row_number,
            protocol=protocol,
            field_name=field_name,
            value=raw,
        )
        return None

    if not number.is_finite():
        report.error(
            "non_finite_number",
            "Valor numérico infinito ou indefinido.",
            row=row_number,
            protocol=protocol,
            field_name=field_name,
            value=raw,
        )
        return None
    if number < 0:
        report.error(
            "negative_number",
            "Danos e prejuízos não podem ser negativos.",
            row=row_number,
            protocol=protocol,
            field_name=field_name,
            value=raw,
        )
        return None
    if integer:
        if number != number.to_integral_value():
            report.error(
                "fractional_count",
                "Contagem de pessoas deve ser um número inteiro.",
                row=row_number,
                protocol=protocol,
                field_name=field_name,
                value=raw,
            )
            return None
        return int(number)
    return float(number.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def parse_date(
    value: str | None,
    protocol: str,
    *,
    field_name: str,
    row_number: int,
    report: ValidationReport,
) -> tuple[str, str] | None:
    text = (value or "").strip()
    try:
        parsed = datetime.strptime(text, "%d/%m/%Y")
        return parsed.strftime("%Y-%m-%d"), parsed.strftime("%Y-%m")
    except ValueError:
        suffix = protocol.rsplit("-", 1)[-1]
        if len(suffix) == 8 and suffix.isdigit():
            try:
                parsed = datetime.strptime(suffix, "%Y%m%d")
            except ValueError:
                parsed = None
            if parsed is not None:
                report.fallback_dates[field_name] += 1
                report.warning(
                    "date_from_protocol",
                    "Data recuperada do sufixo do protocolo.",
                    row=row_number,
                    protocol=protocol,
                    field_name=field_name,
                    value=text,
                )
                return parsed.strftime("%Y-%m-%d"), parsed.strftime("%Y-%m")

    report.error(
        "invalid_date",
        "Data inválida e não recuperável pelo protocolo.",
        row=row_number,
        protocol=protocol,
        field_name=field_name,
        value=text,
    )
    return None


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


def dump_json_gzip(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    with path.open("wb") as raw:
        with gzip.GzipFile(fileobj=raw, mode="wb", mtime=0) as compressed:
            compressed.write(content)


def validate_required_columns(
    fieldnames: list[str] | None, report: ValidationReport
) -> bool:
    available = set(fieldnames or [])
    missing = [name for name in REQUIRED_FIELDS if name not in available]
    for field_name in missing:
        report.error(
            "missing_column",
            "Coluna obrigatória ausente na fonte.",
            field_name=field_name,
        )
    return not missing


def validate_identity(
    source: dict[str, str | None],
    *,
    row_number: int,
    protocols: set[str],
    municipality_names: dict[str, tuple[str, str]],
    report: ValidationReport,
) -> tuple[str, str, str, str, str] | None:
    valid = True
    protocol = (source.get("Protocolo_S2iD") or "").strip()
    uf = (source.get("Sigla_UF") or "").strip().upper()
    code = (source.get("Cod_IBGE_Mun") or "").strip()
    name = (source.get("Nome_Municipio") or "").strip()
    disaster_type = (source.get("descricao_tipologia") or "").strip()

    if not protocol:
        report.error("missing_protocol", "Protocolo ausente.", row=row_number)
        valid = False
    elif protocol in protocols:
        report.error(
            "duplicate_protocol",
            "Protocolo duplicado.",
            row=row_number,
            protocol=protocol,
        )
        valid = False
    else:
        protocols.add(protocol)

    if uf not in UF_CODE_PREFIX:
        report.error(
            "invalid_uf",
            "Sigla de UF inválida.",
            row=row_number,
            protocol=protocol,
            field_name="Sigla_UF",
            value=uf,
        )
        valid = False

    if len(code) != 7 or not code.isdigit():
        report.error(
            "invalid_municipality_code",
            "Código IBGE deve conter sete algarismos.",
            row=row_number,
            protocol=protocol,
            field_name="Cod_IBGE_Mun",
            value=code,
        )
        valid = False
    elif uf in UF_CODE_PREFIX and not code.startswith(UF_CODE_PREFIX[uf]):
        report.error(
            "municipality_uf_mismatch",
            "Código IBGE não corresponde à UF informada.",
            row=row_number,
            protocol=protocol,
            field_name="Cod_IBGE_Mun",
            value=code,
        )
        valid = False

    if not name:
        report.error(
            "missing_municipality_name",
            "Nome do município ausente.",
            row=row_number,
            protocol=protocol,
            field_name="Nome_Municipio",
        )
        valid = False

    if disaster_type not in TYPE_COLORS:
        report.error(
            "unknown_disaster_type",
            "Tipologia não reconhecida.",
            row=row_number,
            protocol=protocol,
            field_name="descricao_tipologia",
            value=disaster_type,
        )
        valid = False

    known = municipality_names.get(code)
    if known is not None:
        known_name, known_uf = known
        if known_uf != uf:
            report.error(
                "inconsistent_municipality_uf",
                "O mesmo código IBGE aparece associado a UFs diferentes.",
                row=row_number,
                protocol=protocol,
                field_name="Cod_IBGE_Mun",
                value=code,
            )
            valid = False
        elif known_name != name:
            report.warning(
                "municipality_name_variant",
                (
                    "O nome municipal varia na fonte para o mesmo código IBGE; "
                    "o código permanece como identificador e o mapa usa o nome da malha."
                ),
                row=row_number,
                protocol=protocol,
                field_name="Nome_Municipio",
                value=f"{known_name} | {name}",
            )
    elif code and name and uf:
        municipality_names[code] = (name, uf)

    if not valid:
        return None
    return protocol, uf, code, name, disaster_type


def read_atlas(
    atlas: Path, report: ValidationReport
) -> tuple[
    list[dict[str, object]],
    Counter[str],
    Counter[str],
    dict[str, tuple[str, str]],
    set[str],
]:
    type_counts: Counter[str] = Counter()
    uf_counts: Counter[str] = Counter()
    municipality_names: dict[str, tuple[str, str]] = {}
    protocols: set[str] = set()
    parsed_rows: list[dict[str, object]] = []

    with atlas.open("r", encoding="iso-8859-1", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        if not validate_required_columns(reader.fieldnames, report):
            return parsed_rows, type_counts, uf_counts, municipality_names, protocols

        for row_number, source in enumerate(reader, start=2):
            report.rows_read += 1
            identity = validate_identity(
                source,
                row_number=row_number,
                protocols=protocols,
                municipality_names=municipality_names,
                report=report,
            )
            protocol = (source.get("Protocolo_S2iD") or "").strip()

            event = parse_date(
                source.get("Data_Evento"),
                protocol,
                field_name="Data_Evento",
                row_number=row_number,
                report=report,
            )
            registration_source = source.get("Data_Registro") or source.get("Data_Evento")
            if not (source.get("Data_Registro") or "").strip():
                report.fallback_dates["Data_Registro->Data_Evento"] += 1
            registration = parse_date(
                registration_source,
                protocol,
                field_name="Data_Registro",
                row_number=row_number,
                report=report,
            )

            damages: list[int | float] = []
            damages_valid = True
            for field_name in DAMAGE_FIELDS:
                parsed = parse_number(
                    source.get(field_name),
                    integer=field_name in INTEGER_DAMAGE_FIELDS,
                    field_name=field_name,
                    row_number=row_number,
                    protocol=protocol,
                    report=report,
                )
                if parsed is None:
                    damages_valid = False
                else:
                    damages.append(parsed)

            if identity is None or event is None or registration is None or not damages_valid:
                continue

            protocol, uf, code, name, disaster_type = identity
            event_date, period = event
            registration_date, _ = registration
            if registration_date < event_date:
                report.warning(
                    "registration_before_event",
                    (
                        "Data de registro anterior à data do evento; mantida para "
                        "preservar o dado oficial e sinalizada para revisão."
                    ),
                    row=row_number,
                    protocol=protocol,
                    field_name="Data_Registro",
                    value=registration_date,
                )

            type_counts[disaster_type] += 1
            uf_counts[uf] += 1
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

    report.rows_accepted = len(parsed_rows)
    if not parsed_rows:
        report.error("no_valid_rows", "Nenhuma linha válida encontrada na fonte.")

    for missing_type in sorted(set(TYPE_COLORS) - set(type_counts)):
        report.error(
            "missing_disaster_type",
            "Tipologia oficial ausente na fonte.",
            field_name="descricao_tipologia",
            value=missing_type,
        )

    return parsed_rows, type_counts, uf_counts, municipality_names, protocols


def make_outputs(
    stage: Path,
    *,
    args: argparse.Namespace,
    source_sha256: str,
    parsed_rows: list[dict[str, object]],
    type_counts: Counter[str],
    uf_counts: Counter[str],
    municipality_names: dict[str, tuple[str, str]],
    protocols: set[str],
) -> dict[str, int]:
    min_period = min(str(row["period"]) for row in parsed_rows)
    max_period = max(str(row["period"]) for row in parsed_rows)
    periods = all_months(min_period, max_period)
    period_index = {period: index for index, period in enumerate(periods)}
    official_types = list(TYPE_COLORS)
    type_index = {name: index for index, name in enumerate(official_types)}

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
    dump_json_gzip(
        stage / "atlas-summary.json.gz",
        {"columns": SUMMARY_COLUMNS, "rows": summary_rows},
    )

    for uf, rows in sorted(events_by_uf.items()):
        rows.sort(key=lambda item: (item[0], item[1], item[2], item[3]))
        dump_json_gzip(
            stage / "events" / f"{uf}.json.gz",
            {"columns": EVENT_COLUMNS, "rows": rows},
        )

    manifest = {
        "title": "Atlas Espaço-Temporal de Desastres",
        "version": args.version,
        "sourceUrl": args.source_url,
        "sourceSha256": source_sha256,
        "generatedAt": now_utc(),
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
            "summary": "data/atlas-summary.json.gz",
            "nationalGeometry": "data/geo/municipios-br.geojson.gz",
            "stateGeometryPattern": "data/geo/uf/{UF}.json.gz",
            "stateEventsPattern": "data/events/{UF}.json.gz",
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
    dump_json(stage / "manifest.json", manifest)

    return {
        "events": len(parsed_rows),
        "summaryRows": len(summary_rows),
        "periods": len(periods),
        "types": len(official_types),
        "states": len(events_by_uf),
    }


def publish_outputs(stage: Path, output: Path) -> None:
    """Troca apenas os artefatos gerados, com restauração em caso de falha."""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    replacements = [
        (stage / "events", output / "events"),
        (stage / "atlas-summary.json.gz", output / "atlas-summary.json.gz"),
        (stage / "manifest.json", output / "manifest.json"),
    ]
    legacy_summary = output / "atlas-summary.json"

    with tempfile.TemporaryDirectory(prefix="atlas-backup-", dir=output.parent) as raw:
        backup = Path(raw)
        moved_existing: list[tuple[Path, Path]] = []
        installed: list[Path] = []
        try:
            for _, target in replacements:
                if target.exists():
                    stored = backup / target.name
                    target.replace(stored)
                    moved_existing.append((stored, target))
            if legacy_summary.exists():
                stored = backup / legacy_summary.name
                legacy_summary.replace(stored)
                moved_existing.append((stored, legacy_summary))

            for source, target in replacements:
                source.replace(target)
                installed.append(target)
        except Exception:
            for target in reversed(installed):
                if target.is_dir():
                    shutil.rmtree(target)
                elif target.exists():
                    target.unlink()
            for stored, target in reversed(moved_existing):
                stored.replace(target)
            raise


def build(args: argparse.Namespace) -> dict[str, int]:
    if not args.atlas.is_file():
        raise FileNotFoundError(f"Arquivo do Atlas não encontrado: {args.atlas}")

    source_sha256 = file_sha256(args.atlas)
    report = ValidationReport(
        source=str(args.atlas),
        source_sha256=source_sha256,
        source_url=args.source_url,
        version=args.version,
        started_at=now_utc(),
    )
    status = "failed"
    try:
        (
            parsed_rows,
            type_counts,
            uf_counts,
            municipality_names,
            protocols,
        ) = read_atlas(args.atlas, report)
        if report.errors:
            raise AtlasValidationError(
                f"Fonte rejeitada: {report.errors} erro(s); consulte {args.report}."
            )

        args.output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(
            prefix="atlas-build-", dir=args.output.parent
        ) as raw:
            stage = Path(raw)
            result = make_outputs(
                stage,
                args=args,
                source_sha256=source_sha256,
                parsed_rows=parsed_rows,
                type_counts=type_counts,
                uf_counts=uf_counts,
                municipality_names=municipality_names,
                protocols=protocols,
            )
            publish_outputs(stage, args.output)
        status = "ok"
        return result
    finally:
        write_report(args.report, report.as_dict(status=status))


def fail(message: str) -> NoReturn:
    print(json.dumps({"status": "failed", "error": message}, ensure_ascii=False), file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    args = parse_args()
    try:
        result = build(args)
    except (AtlasValidationError, FileNotFoundError, OSError) as exc:
        fail(str(exc))
    print(json.dumps({"status": "ok", **result}, ensure_ascii=False))


if __name__ == "__main__":
    main()
