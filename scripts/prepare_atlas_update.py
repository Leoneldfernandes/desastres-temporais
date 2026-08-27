#!/usr/bin/env python3
"""Baixa e compara uma nova versão do Atlas antes de abrir um pull request."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import sys
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import NoReturn
from urllib.request import Request, urlopen

from scripts.check_atlas_update import AtlasRelease, parse_release_url


MAX_CSV_BYTES = 500 * 1024 * 1024
IDENTITY_FIELDS = (
    "period",
    "municipalityCode",
    "type",
    "eventDate",
    "registrationDate",
)
DAMAGE_FIELDS = (
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
)
MAX_PR_DETAIL_ROWS = 50

DAMAGE_LABELS = {
    "humanTotal": "Danos humanos",
    "deaths": "Mortos",
    "injured": "Feridos",
    "sick": "Enfermos",
    "homeless": "Desabrigados",
    "displaced": "Desalojados",
    "missing": "Desaparecidos",
    "droughtAffected": "Afetados por seca e estiagem",
    "otherAffected": "Outros afetados",
    "publicLoss": "Prejuízos públicos (R$)",
    "privateLoss": "Prejuízos privados (R$)",
}

IDENTITY_LABELS = {
    "period": "Mês de referência",
    "municipalityCode": "Código territorial",
    "type": "Tipologia",
    "eventDate": "Data do evento",
    "registrationDate": "Data de registro",
    "uf": "UF",
}


class AtlasPreparationError(RuntimeError):
    """Indica que a atualização não pode avançar automaticamente."""


@dataclass(frozen=True)
class EventRecord:
    protocol: str
    uf: str
    period: str
    municipality_code: str
    disaster_type: str
    event_date: str
    registration_date: str
    damages: dict[str, Decimal]

    @property
    def identity(self) -> dict[str, str]:
        return {
            "period": self.period,
            "municipalityCode": self.municipality_code,
            "type": self.disaster_type,
            "eventDate": self.event_date,
            "registrationDate": self.registration_date,
        }


def load_json(path: Path) -> object:
    if path.suffix == ".gz":
        handle = gzip.open(path, mode="rt", encoding="utf-8")
    else:
        handle = path.open(encoding="utf-8")
    with handle:
        return json.load(handle)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def release_metadata(release: AtlasRelease) -> dict[str, str]:
    version_slug = release.version.replace(".", "-")
    slug = (
        f"{release.released_on.isoformat()}-v{version_slug}-"
        f"{release.start_year}-{release.end_year}"
    )
    return {
        "url": release.url,
        "label": release.label,
        "slug": slug,
        "branch": f"automation/atlas-{slug}",
        "title": f"Dados — Atlas {release.label}",
    }


def write_github_output(path: Path, metadata: dict[str, str]) -> None:
    with path.open("a", encoding="utf-8") as handle:
        for key in ("url", "label", "slug", "branch", "title"):
            handle.write(f"{key}={metadata[key]}\n")


def download_release(
    source_url: str,
    output: Path,
    *,
    timeout: int = 120,
    max_bytes: int = MAX_CSV_BYTES,
) -> dict[str, object]:
    expected = parse_release_url(source_url)
    request = Request(
        source_url,
        headers={
            "Accept": "text/csv,application/octet-stream;q=0.9,*/*;q=0.1",
            "User-Agent": "desastres-temporais-atlas-update/1.0",
        },
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(f"{output.suffix}.tmp")
    digest = hashlib.sha256()
    downloaded = 0

    try:
        with urlopen(request, timeout=timeout) as response, temporary.open("wb") as handle:
            final_url = response.geturl()
            final_release = parse_release_url(final_url)
            if final_release != expected:
                raise AtlasPreparationError(
                    "O download redirecionou para uma versão diferente da detectada."
                )

            declared_size = response.headers.get("Content-Length")
            if declared_size and int(declared_size) > max_bytes:
                raise AtlasPreparationError("O CSV excede o limite de 500 MB.")

            while chunk := response.read(1024 * 1024):
                downloaded += len(chunk)
                if downloaded > max_bytes:
                    raise AtlasPreparationError("O CSV excede o limite de 500 MB.")
                digest.update(chunk)
                handle.write(chunk)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise

    if downloaded == 0:
        temporary.unlink(missing_ok=True)
        raise AtlasPreparationError("O Atlas devolveu um arquivo vazio.")

    temporary.replace(output)
    return {
        "status": "ok",
        "sourceUrl": source_url,
        "bytes": downloaded,
        "sha256": digest.hexdigest(),
    }


def decimal_value(value: object, *, field: str, protocol: str) -> Decimal:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise AtlasPreparationError(
            f"O campo {field} do protocolo {protocol} não é numérico."
        )
    number = Decimal(str(value))
    if not number.is_finite() or number < 0:
        raise AtlasPreparationError(
            f"O campo {field} do protocolo {protocol} é inválido."
        )
    return number


def load_events(data: Path) -> tuple[dict[str, EventRecord], dict[str, object]]:
    manifest = load_json(data / "manifest.json")
    if not isinstance(manifest, dict):
        raise AtlasPreparationError("O manifesto não contém um objeto JSON.")

    periods = manifest.get("periods")
    types = manifest.get("types")
    expected_columns = manifest.get("eventColumns")
    if not isinstance(periods, list) or not isinstance(types, list):
        raise AtlasPreparationError("Períodos ou tipologias ausentes no manifesto.")
    if not isinstance(expected_columns, list):
        raise AtlasPreparationError("Colunas de eventos ausentes no manifesto.")

    type_names = [str(item["name"]) for item in types]
    column_index = {str(name): index for index, name in enumerate(expected_columns)}
    required = {
        "period",
        "municipalityCode",
        "type",
        "protocol",
        "eventDate",
        "registrationDate",
        *DAMAGE_FIELDS,
    }
    if not required <= set(column_index):
        missing = ", ".join(sorted(required - set(column_index)))
        raise AtlasPreparationError(f"Colunas ausentes nos eventos: {missing}.")

    records: dict[str, EventRecord] = {}
    for path in sorted((data / "events").glob("*.json.gz")):
        payload = load_json(path)
        if not isinstance(payload, dict) or payload.get("columns") != expected_columns:
            raise AtlasPreparationError(f"Colunas divergentes em {path}.")
        rows = payload.get("rows")
        if not isinstance(rows, list):
            raise AtlasPreparationError(f"Linhas ausentes em {path}.")

        uf = path.name.removesuffix(".json.gz")
        for row in rows:
            if not isinstance(row, list) or len(row) != len(expected_columns):
                raise AtlasPreparationError(f"Linha inválida em {path}.")
            protocol = str(row[column_index["protocol"]])
            if protocol in records:
                raise AtlasPreparationError(f"Protocolo duplicado: {protocol}.")

            period_index = int(row[column_index["period"]])
            type_index = int(row[column_index["type"]])
            try:
                if period_index < 0 or type_index < 0:
                    raise IndexError
                period = str(periods[period_index])
                disaster_type = type_names[type_index]
            except (IndexError, TypeError) as error:
                raise AtlasPreparationError(
                    f"Índice inválido no protocolo {protocol}."
                ) from error

            records[protocol] = EventRecord(
                protocol=protocol,
                uf=uf,
                period=period,
                municipality_code=str(row[column_index["municipalityCode"]]),
                disaster_type=disaster_type,
                event_date=str(row[column_index["eventDate"]]),
                registration_date=str(row[column_index["registrationDate"]]),
                damages={
                    field: decimal_value(
                        row[column_index[field]], field=field, protocol=protocol
                    )
                    for field in DAMAGE_FIELDS
                },
            )

    return records, manifest


def numeric_json(value: Decimal) -> int | float:
    if value == value.to_integral_value():
        return int(value)
    return float(value.quantize(Decimal("0.01")))


def totals(records: dict[str, EventRecord]) -> dict[str, Decimal]:
    result = {field: Decimal(0) for field in DAMAGE_FIELDS}
    for record in records.values():
        for field, value in record.damages.items():
            result[field] += value
    return result


def count_by(records: dict[str, EventRecord], attribute: str) -> Counter[str]:
    return Counter(str(getattr(record, attribute)) for record in records.values())


def delta_table(
    current: Counter[str], candidate: Counter[str]
) -> dict[str, dict[str, int]]:
    return {
        key: {
            "current": current[key],
            "candidate": candidate[key],
            "delta": candidate[key] - current[key],
        }
        for key in sorted(set(current) | set(candidate))
    }


def validate_release_transition(
    current_manifest: dict[str, object],
    candidate_manifest: dict[str, object],
    errors: list[str],
) -> tuple[AtlasRelease, AtlasRelease]:
    current = parse_release_url(str(current_manifest.get("sourceUrl", "")))
    candidate = parse_release_url(str(candidate_manifest.get("sourceUrl", "")))

    if candidate.url != current.url and candidate.order <= current.order:
        errors.append("A versão candidata não é posterior à versão publicada.")
    if candidate_manifest.get("version") != candidate.label:
        errors.append("A versão do manifesto não corresponde ao nome do CSV oficial.")

    periods = candidate_manifest.get("periods")
    if not isinstance(periods, list) or not periods:
        errors.append("A versão candidata não possui períodos mensais.")
    else:
        if periods[0] != f"{candidate.start_year:04d}-01":
            errors.append("O primeiro mês não corresponde ao período informado no CSV.")
        if periods[-1] != f"{candidate.end_year:04d}-12":
            errors.append("O último mês não corresponde ao período informado no CSV.")

    current_types = [item.get("name") for item in current_manifest.get("types", [])]
    candidate_types = [item.get("name") for item in candidate_manifest.get("types", [])]
    if candidate_types != current_types:
        errors.append("A lista ou a ordem das 16 tipologias oficiais foi alterada.")

    source_sha = str(candidate_manifest.get("sourceSha256", ""))
    if candidate.url != current.url and (
        len(source_sha) != 64
        or any(char not in "0123456789abcdef" for char in source_sha)
    ):
        errors.append("O manifesto candidato não contém um SHA-256 válido do CSV.")

    return current, candidate


def compare_releases(
    current_data: Path,
    candidate_data: Path,
    *,
    build_report_path: Path | None = None,
) -> dict[str, object]:
    current_records, current_manifest = load_events(current_data)
    candidate_records, candidate_manifest = load_events(candidate_data)
    errors: list[str] = []
    current_release, candidate_release = validate_release_transition(
        current_manifest, candidate_manifest, errors
    )

    removed_protocols = sorted(set(current_records) - set(candidate_records))
    if removed_protocols:
        errors.append(
            f"{len(removed_protocols)} registro(s) publicado(s) desapareceram da nova base."
        )

    identity_changes: list[dict[str, object]] = []
    identity_change_count = 0
    corrected_records = 0
    corrected_fields = Counter[str]()
    damage_corrections: list[dict[str, object]] = []
    for protocol in sorted(set(current_records) & set(candidate_records)):
        current = current_records[protocol]
        candidate = candidate_records[protocol]
        changed_identity = {
            field: {
                "current": current.identity[field],
                "candidate": candidate.identity[field],
            }
            for field in IDENTITY_FIELDS
            if current.identity[field] != candidate.identity[field]
        }
        if current.uf != candidate.uf:
            changed_identity["uf"] = {
                "current": current.uf,
                "candidate": candidate.uf,
            }
        if changed_identity:
            identity_change_count += 1
            identity_changes.append(
                {
                    "protocol": protocol,
                    "uf": current.uf,
                    "municipalityCode": current.municipality_code,
                    "disasterType": current.disaster_type,
                    "fields": changed_identity,
                }
            )
            continue

        changed_damage_fields = {
            field: {
                "current": numeric_json(current.damages[field]),
                "candidate": numeric_json(candidate.damages[field]),
                "delta": numeric_json(
                    candidate.damages[field] - current.damages[field]
                ),
            }
            for field in DAMAGE_FIELDS
            if current.damages[field] != candidate.damages[field]
        }
        if changed_damage_fields:
            corrected_records += 1
            corrected_fields.update(changed_damage_fields.keys())
            damage_corrections.append(
                {
                    "protocol": protocol,
                    "uf": current.uf,
                    "municipalityCode": current.municipality_code,
                    "disasterType": current.disaster_type,
                    "eventDate": current.event_date,
                    "fields": changed_damage_fields,
                }
            )

    if identity_change_count:
        errors.append(
            "Um ou mais registros existentes mudaram município, UF, tipologia ou data."
        )

    current_totals = totals(current_records)
    candidate_totals = totals(candidate_records)
    damage_totals = {
        field: {
            "current": numeric_json(current_totals[field]),
            "candidate": numeric_json(candidate_totals[field]),
            "delta": numeric_json(candidate_totals[field] - current_totals[field]),
        }
        for field in DAMAGE_FIELDS
    }

    build_report: dict[str, object] = {}
    if build_report_path is not None:
        loaded = load_json(build_report_path)
        if not isinstance(loaded, dict):
            errors.append("O relatório de construção não contém um objeto JSON.")
        else:
            build_report = loaded
            if loaded.get("status") != "ok" or loaded.get("errors") != 0:
                errors.append("A construção da base candidata registrou erros.")

    added_protocols = sorted(set(candidate_records) - set(current_records))
    unchanged_source = candidate_release.url == current_release.url
    status = "rejected" if errors else ("unchanged" if unchanged_source else "approved")
    metadata = release_metadata(candidate_release)
    return {
        "schemaVersion": 2,
        "status": status,
        "current": {
            "version": current_manifest.get("version"),
            "sourceUrl": current_release.url,
            "events": len(current_records),
            "periodStart": current_manifest.get("periods", [None])[0],
            "periodEnd": current_manifest.get("periods", [None])[-1],
        },
        "candidate": {
            "version": candidate_manifest.get("version"),
            "sourceUrl": candidate_release.url,
            "sourceSha256": candidate_manifest.get("sourceSha256"),
            "generatedAt": candidate_manifest.get("generatedAt"),
            "events": len(candidate_records),
            "periodStart": candidate_manifest.get("periods", [None])[0],
            "periodEnd": candidate_manifest.get("periods", [None])[-1],
            **{key: metadata[key] for key in ("slug", "branch", "title")},
        },
        "changes": {
            "addedRecords": len(added_protocols),
            "addedProtocols": added_protocols,
            "removedRecords": len(removed_protocols),
            "removedProtocols": removed_protocols,
            "identityChanges": identity_change_count,
            "identityChangeDetails": identity_changes,
            "correctedRecords": corrected_records,
            "correctedFields": dict(sorted(corrected_fields.items())),
            "damageCorrections": damage_corrections,
            "eventsByUf": delta_table(
                count_by(current_records, "uf"), count_by(candidate_records, "uf")
            ),
            "eventsByType": delta_table(
                count_by(current_records, "disaster_type"),
                count_by(candidate_records, "disaster_type"),
            ),
            "damageTotals": damage_totals,
        },
        "build": {
            "warnings": build_report.get("warnings", 0),
            "fallbackDates": build_report.get("fallbackDates", {}),
            "emptyNumericCells": build_report.get("emptyNumericCells", {}),
        },
        "errors": errors,
    }


def format_integer(value: object) -> str:
    return f"{int(value):,}".replace(",", ".")


def format_number(value: object) -> str:
    number = Decimal(str(value))
    if number == number.to_integral_value():
        return format_integer(number)
    formatted = f"{number:,.2f}"
    return formatted.replace(",", "_").replace(".", ",").replace("_", ".")


def markdown_cell(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def limited_rows(
    rows: list[tuple[object, ...]], detail_limit: int | None
) -> tuple[list[tuple[object, ...]], int]:
    if detail_limit is None:
        return rows, 0
    displayed = rows[:detail_limit]
    return displayed, len(rows) - len(displayed)


def report_markdown(
    report: dict[str, object],
    *,
    detail_limit: int | None = None,
    complete_report_path: str | None = None,
) -> str:
    current = report["current"]
    candidate = report["candidate"]
    changes = report["changes"]
    build = report["build"]
    status = str(report["status"])
    status_label = {
        "approved": "Aprovada para revisão",
        "unchanged": "Sem mudança de versão",
        "rejected": "Interrompida por inconsistência",
    }[status]

    lines = [
        "## Atualização automática do Atlas",
        "",
        f"**Resultado da preparação:** {status_label}.",
        "",
        "| Item | Publicado | Candidato | Diferença |",
        "|---|---:|---:|---:|",
        (
            f"| Registros | {format_integer(current['events'])} | "
            f"{format_integer(candidate['events'])} | "
            f"{format_integer(changes['addedRecords'])} novo(s) |"
        ),
        (
            f"| Período final | {current['periodEnd']} | "
            f"{candidate['periodEnd']} | — |"
        ),
        "",
        f"- **Versão:** {candidate['version']}",
        f"- **Fonte:** [CSV oficial do Atlas]({candidate['sourceUrl']})",
        f"- **SHA-256:** `{candidate['sourceSha256']}`",
        f"- **Registros com correções de danos ou prejuízos:** {format_integer(changes['correctedRecords'])}",
        f"- **Avisos da leitura:** {format_integer(build['warnings'])}",
        "- **CSV bruto:** usado temporariamente e não incluído no repositório.",
        "",
    ]
    lines.extend(
        [
            "### Variações principais de danos e prejuízos",
            "",
            "| Campo | Publicado | Candidato | Diferença |",
            "|---|---:|---:|---:|",
        ]
    )
    for field in ("humanTotal", "deaths", "publicLoss", "privateLoss"):
        label = DAMAGE_LABELS[field]
        values = changes["damageTotals"][field]
        lines.append(
            f"| {label} | {format_number(values['current'])} | "
            f"{format_number(values['candidate'])} | {format_number(values['delta'])} |"
        )
    lines.append("")

    changed_ufs = [
        (key, values)
        for key, values in changes["eventsByUf"].items()
        if values["delta"]
    ]
    if changed_ufs:
        lines.extend(["### Novos registros por UF", ""])
        lines.extend(
            f"- **{uf}:** {format_integer(values['delta'])}"
            for uf, values in changed_ufs
        )
        lines.append("")

    changed_types = [
        (key, values)
        for key, values in changes["eventsByType"].items()
        if values["delta"]
    ]
    if changed_types:
        lines.extend(["### Novos registros por tipologia", ""])
        lines.extend(
            f"- **{disaster_type}:** {format_integer(values['delta'])}"
            for disaster_type, values in changed_types
        )
        lines.append("")

    if changes["correctedFields"]:
        lines.extend(["### Síntese dos campos corrigidos", ""])
        lines.extend(
            f"- **{DAMAGE_LABELS[field]} (`{field}`):** "
            f"{format_integer(count)} registro(s)"
            for field, count in changes["correctedFields"].items()
        )
        lines.append("")

    correction_rows = [
        (
            correction["protocol"],
            correction["uf"],
            correction["municipalityCode"],
            correction["disasterType"],
            correction["eventDate"],
            DAMAGE_LABELS[field],
            values["current"],
            values["candidate"],
            values["delta"],
        )
        for correction in changes["damageCorrections"]
        for field, values in correction["fields"].items()
    ]
    if correction_rows:
        displayed, omitted = limited_rows(correction_rows, detail_limit)
        lines.extend(
            [
                "### Correções detalhadas por protocolo",
                "",
                (
                    "Cada linha abaixo corresponde a um campo alterado em um protocolo "
                    "já publicado. A diferença é calculada como candidato menos publicado."
                ),
                "",
                "| Protocolo | UF | Código territorial | Tipologia | Data do evento | Campo | Publicado | Candidato | Diferença |",
                "|---|---|---|---|---|---|---:|---:|---:|",
            ]
        )
        lines.extend(
            "| "
            + " | ".join(
                [
                    *(markdown_cell(value) for value in row[:6]),
                    *(format_number(value) for value in row[6:]),
                ]
            )
            + " |"
            for row in displayed
        )
        lines.append("")
        if omitted:
            lines.append(
                f"_O texto resumido omite {format_integer(omitted)} linha(s) de detalhe para respeitar o limite do Pull Request._"
            )
            lines.append("")

    removed_rows = [(protocol,) for protocol in changes["removedProtocols"]]
    if removed_rows:
        displayed, omitted = limited_rows(removed_rows, detail_limit)
        lines.extend(["### Protocolos removidos", ""])
        lines.extend(f"- `{markdown_cell(row[0])}`" for row in displayed)
        if omitted:
            lines.append(
                f"- _Mais {format_integer(omitted)} protocolo(s) constam no relatório completo._"
            )
        lines.append("")

    identity_rows = [
        (
            change["protocol"],
            IDENTITY_LABELS[field],
            values["current"],
            values["candidate"],
        )
        for change in changes["identityChangeDetails"]
        for field, values in change["fields"].items()
    ]
    if identity_rows:
        displayed, omitted = limited_rows(identity_rows, detail_limit)
        lines.extend(
            [
                "### Mudanças de identidade rejeitadas",
                "",
                "| Protocolo | Campo | Publicado | Candidato |",
                "|---|---|---|---|",
            ]
        )
        lines.extend(
            "| " + " | ".join(markdown_cell(value) for value in row) + " |"
            for row in displayed
        )
        if omitted:
            lines.append("")
            lines.append(
                f"_Mais {format_integer(omitted)} alteração(ões) consta(m) no relatório completo._"
            )
        lines.append("")

    if complete_report_path:
        lines.extend(
            [
                "### Relatório permanente",
                "",
                (
                    "O detalhamento integral, sem cortes, foi incluído neste Pull Request "
                    f"em `{complete_report_path}`. A versão estruturada para auditoria "
                    "computacional está no arquivo JSON de mesmo nome."
                ),
                "",
            ]
        )

    if report["errors"]:
        lines.extend(["### Inconsistências", ""])
        lines.extend(f"- {message}" for message in report["errors"])
        lines.append("")
    lines.extend(
        [
            "### Regra de segurança",
            "",
            (
                "Nenhum protocolo já publicado pode desaparecer ou mudar de município, "
                "UF, tipologia ou data. Correções nos campos de danos humanos e "
                "prejuízos são permitidas e registradas neste relatório."
            ),
            "",
            (
                "Este pull request apenas prepara a nova base. A publicação depende "
                "de revisão e incorporação manual."
            ),
            "",
            "### Etapas executadas",
            "",
            "1. consulta da página oficial e identificação do CSV consolidado;",
            "2. validação do domínio, do nome, da versão e da data do arquivo;",
            "3. download temporário com limite de tamanho e cálculo do SHA-256;",
            "4. leitura e validação das linhas da fonte;",
            "5. reconstrução dos arquivos derivados sem alterar a publicação vigente;",
            "6. validação cruzada dos períodos, tipologias, UFs, feições e contagens;",
            "7. comparação de todos os protocolos com a versão publicada;",
            "8. geração deste texto e do relatório JSON auditável;",
            "9. criação de branch e Pull Request somente se todas as regras forem aprovadas;",
            "10. execução dos testes obrigatórios e espera pela incorporação manual.",
            "",
        ]
    )
    return "\n".join(lines)


def write_release_records(
    directory: Path, report: dict[str, object]
) -> tuple[Path, Path]:
    slug = str(report["candidate"]["slug"])
    json_path = directory / f"atlas-{slug}.json"
    markdown_path = directory / f"atlas-{slug}.md"
    write_json(json_path, report)
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.write_text(
        report_markdown(report) + "\n",
        encoding="utf-8",
    )
    return json_path, markdown_path


def fail(message: str) -> NoReturn:
    print(json.dumps({"status": "failed", "error": message}, ensure_ascii=False), file=sys.stderr)
    raise SystemExit(1)


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    inspect_parser = subparsers.add_parser("inspect")
    inspect_parser.add_argument("--source-url", required=True)
    inspect_parser.add_argument("--github-output", type=Path)

    download_parser = subparsers.add_parser("download")
    download_parser.add_argument("--source-url", required=True)
    download_parser.add_argument("--output", required=True, type=Path)

    compare_parser = subparsers.add_parser("compare")
    compare_parser.add_argument("--current-data", required=True, type=Path)
    compare_parser.add_argument("--candidate-data", required=True, type=Path)
    compare_parser.add_argument("--build-report", type=Path)
    compare_parser.add_argument("--report-json", required=True, type=Path)
    compare_parser.add_argument("--report-markdown", type=Path)
    compare_parser.add_argument("--release-record-dir", type=Path)

    args = parser.parse_args()
    try:
        if args.command == "inspect":
            metadata = release_metadata(parse_release_url(args.source_url))
            if args.github_output:
                write_github_output(args.github_output, metadata)
            print(json.dumps(metadata, ensure_ascii=False))
            return 0

        if args.command == "download":
            result = download_release(args.source_url, args.output)
            print(json.dumps(result, ensure_ascii=False))
            return 0

        report = compare_releases(
            args.current_data,
            args.candidate_data,
            build_report_path=args.build_report,
        )
        write_json(args.report_json, report)
        complete_report_path: str | None = None
        if args.release_record_dir and report["status"] == "approved":
            _, markdown_path = write_release_records(args.release_record_dir, report)
            complete_report_path = markdown_path.as_posix()
        markdown = report_markdown(
            report,
            detail_limit=(MAX_PR_DETAIL_ROWS if complete_report_path else None),
            complete_report_path=complete_report_path,
        )
        if args.report_markdown:
            args.report_markdown.parent.mkdir(parents=True, exist_ok=True)
            args.report_markdown.write_text(markdown, encoding="utf-8")
        print(json.dumps({"status": report["status"]}, ensure_ascii=False))
        return 1 if report["status"] == "rejected" else 0
    except Exception as error:
        fail(str(error))


if __name__ == "__main__":
    raise SystemExit(main())
