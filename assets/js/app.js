/* global L, AtlasExport */

"use strict";

const UF_NAMES = {
  BR: "Brasil",
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

const SUMMARY = Object.freeze({
  period: 0,
  code: 1,
  type: 2,
  events: 3,
  human: 4,
  deaths: 5,
  injured: 6,
  sick: 7,
  homeless: 8,
  displaced: 9,
  missing: 10,
  drought: 11,
  other: 12,
  publicLoss: 13,
  privateLoss: 14,
});

const EVENT = Object.freeze({
  period: 0,
  code: 1,
  type: 2,
  protocol: 3,
  eventDate: 4,
  registrationDate: 5,
  human: 6,
  deaths: 7,
  injured: 8,
  sick: 9,
  homeless: 10,
  displaced: 11,
  missing: 12,
  drought: 13,
  other: 14,
  publicLoss: 15,
  privateLoss: 16,
});

const TEMPORAL_METRICS = Object.freeze({
  events: {
    label: "Ocorrências",
    axisLabel: "Ocorrências (nº)",
    urlValue: "ocorrencias",
  },
  human: {
    label: "Danos humanos",
    axisLabel: "Danos humanos (pessoas)",
    urlValue: "danos",
  },
  loss: {
    label: "Prejuízos econômicos",
    axisLabel: "Prejuízos econômicos (R$)",
    urlValue: "prejuizos",
  },
});

const TYPE_GROUPS = Object.freeze([
  Object.freeze({
    id: "hydrological",
    label: "Hidrológicos",
    typeNames: Object.freeze([
      "Alagamentos",
      "Chuvas Intensas",
      "Enxurradas",
      "Inundações",
      "Movimento de Massa",
    ]),
  }),
  Object.freeze({
    id: "climate-weather",
    label: "Climatológicos e Meteorológicos",
    typeNames: Object.freeze([
      "Estiagem e Seca",
      "Tornado",
      "Vendavais e Ciclones",
      "Granizo",
      "Onda de Frio",
      "Onda de Calor e Baixa Umidade",
      "Incêndio Florestal",
    ]),
  }),
  Object.freeze({
    id: "other",
    label: "Outros",
    typeNames: Object.freeze([
      "Erosão",
      "Doenças infecciosas",
      "Rompimento/Colapso de barragens",
      "Outros",
    ]),
  }),
]);

const ROW_HEIGHT = 42;
const TABLE_HEADER_HEIGHT = 35;
const LOCATOR_POPUP_VISIBLE_MS = 4_000;
const LOCATOR_POPUP_FADE_MS = 700;
const TEMPORAL_CHART_TOP = 30;
const MAP_SCALE_CREDIT_GAP = 4;
const EMPTY_STYLE = Object.freeze({
  color: "#d8e6ef",
  weight: 0.45,
  opacity: 0.25,
  fillColor: "#000000",
  fillOpacity: 0,
  dashArray: null,
});

const formatInteger = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const formatCompact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const formatCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthLong = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });
const dateTimeShort = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const UPDATE_STATES = new Set([
  "awaiting-first-check",
  "up-to-date",
  "update-available",
  "check-failed",
]);
const UPDATE_STATUS_URL =
  "https://raw.githubusercontent.com/Leoneldfernandes/desastres-temporais/atlas-status/data/update-status.json";

const dom = Object.fromEntries(
  [
    "brandCoverage",
    "ufSelector",
    "dataStatus",
    "dataStatusText",
    "updateStatusPanel",
    "closeUpdateStatus",
    "updatePanelState",
    "updateStatusMessage",
    "publishedVersion",
    "publishedCoverage",
    "publishedGeneratedAt",
    "lastAtlasCheck",
    "latestAtlasRow",
    "latestAtlasVersion",
    "kpiPeriod",
    "scopePill",
    "kpiEvents",
    "kpiMunicipalities",
    "kpiHuman",
    "kpiDeaths",
    "typeList",
    "selectAllTypes",
    "clearAllTypes",
    "openExport",
    "exportModal",
    "closeExport",
    "cancelExport",
    "confirmExport",
    "exportTerritory",
    "exportTypes",
    "exportRowCount",
    "exportCurrentPeriod",
    "exportHistoryPeriod",
    "exportFormat",
    "exportStatus",
    "loadingOverlay",
    "loadingTitle",
    "loadingMessage",
    "retryButton",
    "mapStage",
    "toggleFullscreen",
    "resetMapView",
    "displayPeriod",
    "previousPeriod",
    "playButton",
    "playIcon",
    "playLabel",
    "shareView",
    "shareViewLabel",
    "nextPeriod",
    "speedSelect",
    "minPeriod",
    "maxPeriod",
    "periodSlider",
    "playbackMessage",
    "timelinePanel",
    "toggleTemporalAnalysis",
    "temporalAnalysis",
    "temporalContextLabel",
    "temporalBrazil",
    "temporalState",
    "temporalMunicipality",
    "temporalChart",
    "temporalChartTooltip",
    "temporalChartStatus",
    "resultsPeriod",
    "resultCount",
    "resultsViewport",
    "resultsCanvas",
    "emptyResults",
    "damageInjured",
    "damageHomeless",
    "damageDisplaced",
    "damageAffected",
    "damagePublic",
    "damagePrivate",
    "municipalityLocator",
    "municipalitySearchToggle",
    "municipalitySearchPanel",
    "municipalitySearchInput",
    "municipalitySearchClear",
    "municipalitySearchStatus",
    "municipalitySearchResults",
    "detailModal",
    "detailEyebrow",
    "detailTitle",
    "detailContent",
    "closeDetail",
  ].map((id) => [id, document.getElementById(id)])
);

const state = {
  ready: false,
  manifest: null,
  dataVersion: null,
  updateStatus: null,
  periods: [],
  types: [],
  summaryByPeriod: [],
  municipalityByCode: new Map(),
  municipalitySearchIndex: [],
  geometryCache: new Map(),
  eventCache: new Map(),
  layerByCode: new Map(),
  currentAggregates: new Map(),
  previousStyledCodes: new Set(),
  tableRows: [],
  currentPeriod: 0,
  scopeUF: "BR",
  activeTypes: new Set(),
  geoLayer: null,
  hovered: null,
  hoverTimer: null,
  playbackWanted: false,
  playbackTimer: null,
  playbackSpeed: 1000,
  playbackBlocks: new Set(),
  mapResumeTimer: null,
  tableFrame: null,
  detailSnapshot: null,
  locatedMunicipalityCode: null,
  locatorPopupFadeTimer: null,
  locatorPopupCloseTimer: null,
  urlSyncReady: false,
  shareFeedbackTimer: null,
  exportGenerating: false,
  exportReturnFocus: null,
  pseudoFullscreen: false,
  temporalContext: "brazil",
  temporalStateUF: null,
  temporalMetric: "events",
  temporalMunicipalityCode: null,
  temporalSeries: [],
  temporalExpanded: false,
  temporalChartGeometry: null,
  temporalHoverIndex: null,
  temporalFrame: null,
  mapCreditsResizeObserver: null,
  restoringView: false,
};

const mapRenderer = L.canvas({ padding: 0.45, tolerance: 5 });
const map = L.map("map", {
  center: [-14.4, -52.4],
  zoom: 4,
  minZoom: 3,
  maxZoom: 14,
  zoomControl: false,
  preferCanvas: true,
  renderer: mapRenderer,
});

L.control.zoom({ position: "topright" }).addTo(map);
L.control.scale({
  position: "bottomright",
  metric: true,
  imperial: false,
  maxWidth: 110,
}).addTo(map);
map.attributionControl.setPrefix(false);
map.attributionControl.addAttribution(
  '<a href="https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html" target="_blank" rel="noopener">Municípios: IBGE 2025</a> · ' +
    '<a href="https://atlasdigital.mdr.gov.br/" target="_blank" rel="noopener">Desastres: Atlas Digital/MIDR</a>'
);

const imagery = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 18,
    attribution:
      "Imagens © Esri, Maxar, Earthstar Geographics e comunidade GIS",
  }
);
const imageryLabels = L.tileLayer(
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 18, pane: "overlayPane", attribution: "Rótulos © Esri" }
);
const light = L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  {
    subdomains: "abcd",
    maxZoom: 20,
    attribution: "© OpenStreetMap · © CARTO",
  }
);
const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap",
});
const BlankLayer = L.GridLayer.extend({
  createTile() {
    const tile = document.createElement("div");
    tile.style.background = "#f8fafc";
    return tile;
  },
});
const blank = new BlankLayer({ attribution: "Fundo cartográfico branco" });

imagery.addTo(map);
imageryLabels.addTo(map);
L.control
  .layers(
    {
      "Imagens de satélite": imagery,
      "Mapa claro": light,
      "Ruas e localidades": streets,
      "Fundo branco": blank,
    },
    { "Rótulos geográficos": imageryLabels },
    { position: "topright", collapsed: true }
  )
  .addTo(map);

const municipalityTooltip = L.tooltip({
  className: "municipality-tooltip",
  direction: "top",
  opacity: 1,
  offset: [0, -4],
});
const municipalityLocatorPopup = L.popup({
  className: "municipality-locator-popup",
  closeButton: true,
  autoPan: true,
  maxWidth: 280,
  offset: [0, -4],
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function periodDate(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1, 12);
}

function periodLabel(period, short = false) {
  const label = (short ? monthShort : monthLong).format(periodDate(period));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function isoDateLabel(value) {
  const [year, month, day] = String(value).split("-");
  return `${day}/${month}/${year}`;
}

function dateTimeLabel(value, emptyLabel = "Ainda não realizada") {
  if (!value) return emptyLabel;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Data não informada";
  return dateTimeShort.format(parsed);
}

function numericPeriodLabel(period) {
  const [year, month] = String(period).split("-");
  return `${month}/${year}`;
}

function viewStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const requestedUf = String(params.get("uf") || "BR").toUpperCase();
  const uf = Object.hasOwn(UF_NAMES, requestedUf) ? requestedUf : "BR";
  const requestedPeriod = params.get("mes");
  const periodIndex = Math.max(0, state.periods.indexOf(requestedPeriod));
  const allTypes = state.types.map((type) => type.id);
  const requestedTypes = params.get("tipos");
  let types = allTypes;

  if (requestedTypes === "nenhum") {
    types = [];
  } else if (requestedTypes) {
    const parsed = requestedTypes.split(",").map((value) => Number(value));
    const validIds = new Set(allTypes);
    if (
      parsed.length &&
      parsed.every((value) => Number.isInteger(value) && validIds.has(value))
    ) {
      types = [...new Set(parsed)];
    }
  }

  const requestedMunicipality = String(params.get("municipio") || "");
  const municipality = state.municipalityByCode.get(requestedMunicipality);
  const municipalityCode =
    municipality && (uf === "BR" || municipality.uf === uf) ? requestedMunicipality : null;

  const requestedLocatedMunicipality = String(params.get("localizar") || "");
  const locatedMunicipality = state.municipalityByCode.get(requestedLocatedMunicipality);
  const locatedMunicipalityCode =
    locatedMunicipality && (uf === "BR" || locatedMunicipality.uf === uf)
      ? requestedLocatedMunicipality
      : null;

  const requestedHistoricalMunicipality = String(params.get("historico") || "");
  const historicalMunicipality = state.municipalityByCode.get(requestedHistoricalMunicipality);
  const historicalMunicipalityCode =
    historicalMunicipality && (uf === "BR" || historicalMunicipality.uf === uf)
      ? requestedHistoricalMunicipality
      : null;
  const temporalMunicipalityCode =
    historicalMunicipalityCode || locatedMunicipalityCode || municipalityCode;

  const requestedMetric = String(params.get("indicador") || "");
  const temporalMetric =
    Object.entries(TEMPORAL_METRICS).find(([, definition]) => definition.urlValue === requestedMetric)?.[0] ||
    "events";
  const requestedTemporalState = String(params.get("estado") || "").toUpperCase();
  const municipalityState = temporalMunicipalityCode
    ? state.municipalityByCode.get(temporalMunicipalityCode)?.uf
    : null;
  const temporalStateUF =
    requestedTemporalState !== "BR" && Object.hasOwn(UF_NAMES, requestedTemporalState)
      ? requestedTemporalState
      : uf !== "BR"
        ? uf
        : municipalityState || null;
  const requestedTemporalContext = String(params.get("serie") || "").toLowerCase();
  let temporalContext;
  if (requestedTemporalContext === "municipio" && temporalMunicipalityCode) {
    temporalContext = "municipality";
  } else if (requestedTemporalContext === "estado" && temporalStateUF) {
    temporalContext = "state";
  } else if (requestedTemporalContext === "brasil") {
    temporalContext = "brazil";
  } else if (requestedTemporalContext === "geral") {
    temporalContext = uf === "BR" ? "brazil" : "state";
  } else if (temporalMunicipalityCode) {
    temporalContext = "municipality";
  } else {
    temporalContext = uf === "BR" ? "brazil" : "state";
  }
  const temporalExpanded = params.get("grafico") === "aberto";

  return {
    uf,
    periodIndex,
    types,
    municipalityCode,
    locatedMunicipalityCode,
    temporalMunicipalityCode,
    temporalStateUF,
    temporalMetric,
    temporalContext,
    temporalExpanded,
  };
}

function applyTypeSelection(typeIds) {
  state.activeTypes = new Set(typeIds);
  for (const input of dom.typeList.querySelectorAll("input[data-type-id]")) {
    input.checked = state.activeTypes.has(Number(input.value));
  }
  syncTypeGroupStates();
}

function syncViewUrl() {
  if (!state.urlSyncReady) return;
  const url = new URL(window.location.href);
  const selectedTypes = [...state.activeTypes].sort((a, b) => a - b);

  if (state.scopeUF === "BR") url.searchParams.delete("uf");
  else url.searchParams.set("uf", state.scopeUF);
  url.searchParams.set("mes", state.periods[state.currentPeriod]);

  if (selectedTypes.length === state.types.length) {
    url.searchParams.delete("tipos");
  } else if (!selectedTypes.length) {
    url.searchParams.set("tipos", "nenhum");
  } else {
    url.searchParams.set("tipos", selectedTypes.join(","));
  }

  if (state.detailSnapshot?.code) url.searchParams.set("municipio", state.detailSnapshot.code);
  else url.searchParams.delete("municipio");
  if (state.locatedMunicipalityCode) {
    url.searchParams.set("localizar", state.locatedMunicipalityCode);
  } else {
    url.searchParams.delete("localizar");
  }
  if (state.temporalMunicipalityCode) {
    url.searchParams.set("historico", state.temporalMunicipalityCode);
  } else {
    url.searchParams.delete("historico");
  }
  if (state.temporalStateUF) url.searchParams.set("estado", state.temporalStateUF);
  else url.searchParams.delete("estado");
  url.searchParams.set(
    "serie",
    state.temporalContext === "municipality"
      ? "municipio"
      : state.temporalContext === "state"
        ? "estado"
        : "brasil"
  );
  if (state.temporalMetric === "events") url.searchParams.delete("indicador");
  else url.searchParams.set("indicador", TEMPORAL_METRICS[state.temporalMetric].urlValue);
  url.searchParams.set("grafico", state.temporalExpanded ? "aberto" : "fechado");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

async function shareCurrentView() {
  syncViewUrl();
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
  } catch (error) {
    const fallback = document.createElement("textarea");
    fallback.value = url;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.append(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }

  clearTimeout(state.shareFeedbackTimer);
  dom.shareView.classList.add("is-copied");
  dom.shareViewLabel.textContent = "Link copiado";
  state.shareFeedbackTimer = window.setTimeout(() => {
    dom.shareView.classList.remove("is-copied");
    dom.shareViewLabel.textContent = "Compartilhar visualização";
  }, 2200);
}

function exportTerritory() {
  if (state.temporalContext === "municipality" && state.temporalMunicipalityCode) {
    const meta = state.municipalityByCode.get(state.temporalMunicipalityCode);
    if (meta) {
      return {
        kind: "municipality",
        code: meta.code,
        uf: meta.uf,
        label: `Município · ${meta.name} — ${meta.uf}`,
        filename: `${meta.uf}_${meta.code}`,
      };
    }
  }
  const selectedUf = state.temporalContext === "state"
    ? state.temporalStateUF
    : state.scopeUF !== "BR"
      ? state.scopeUF
      : null;
  if (selectedUf && Object.hasOwn(UF_NAMES, selectedUf)) {
    return {
      kind: "state",
      uf: selectedUf,
      label: `Estado · ${UF_NAMES[selectedUf]} — ${selectedUf}`,
      filename: selectedUf,
    };
  }
  return { kind: "brazil", label: "Brasil", filename: "BR" };
}

function exportPeriodMode() {
  return document.querySelector('input[name="exportPeriod"]:checked')?.value === "history"
    ? "history"
    : "current";
}

function rowMatchesExport(row, territory) {
  if (!state.activeTypes.has(row[SUMMARY.type])) return false;
  const code = String(row[SUMMARY.code]);
  const meta = state.municipalityByCode.get(code);
  if (!meta) return false;
  if (territory.kind === "municipality") return code === territory.code;
  if (territory.kind === "state") return meta.uf === territory.uf;
  return true;
}

function collectExportRows(mode = exportPeriodMode()) {
  const territory = exportTerritory();
  const periodIndexes = mode === "history"
    ? state.periods.map((_, index) => index)
    : [state.currentPeriod];
  const rows = [];

  for (const periodIndex of periodIndexes) {
    const period = state.periods[periodIndex];
    const [year, month] = period.split("-").map(Number);
    for (const source of state.summaryByPeriod[periodIndex]) {
      if (!rowMatchesExport(source, territory)) continue;
      const meta = state.municipalityByCode.get(String(source[SUMMARY.code]));
      const publicLoss = source[SUMMARY.publicLoss];
      const privateLoss = source[SUMMARY.privateLoss];
      rows.push({
        periodo: period,
        ano: year,
        mes: month,
        codigo_ibge: meta.code,
        municipio: meta.name,
        uf: meta.uf,
        tipologia: state.types[source[SUMMARY.type]].name,
        ocorrencias: source[SUMMARY.events],
        danos_humanos_total: source[SUMMARY.human],
        mortos: source[SUMMARY.deaths],
        feridos: source[SUMMARY.injured],
        enfermos: source[SUMMARY.sick],
        desabrigados: source[SUMMARY.homeless],
        desalojados: source[SUMMARY.displaced],
        desaparecidos: source[SUMMARY.missing],
        afetados_seca_estiagem: source[SUMMARY.drought],
        outros_afetados: source[SUMMARY.other],
        prejuizo_publico_reais: publicLoss,
        prejuizo_privado_reais: privateLoss,
        prejuizo_total_reais: publicLoss + privateLoss,
      });
    }
  }
  return rows;
}

function exportMetadata(rows, mode) {
  const territory = exportTerritory();
  const selectedTypes = [...state.activeTypes]
    .sort((a, b) => a - b)
    .map((typeId) => state.types[typeId].name);
  const firstPeriod = mode === "history" ? state.periods[0] : state.periods[state.currentPeriod];
  const lastPeriod = mode === "history" ? state.periods.at(-1) : firstPeriod;
  return {
    titulo: "Dados filtrados — Desastres no tempo",
    autor: "Leonel Delmiro Fernandes",
    gerado_em: new Date().toISOString(),
    fonte: "Atlas Digital de Desastres no Brasil — Sedec/MIDR",
    fonte_url: state.manifest.sourceUrl,
    fonte_versao: state.manifest.version,
    fonte_sha256: state.manifest.sourceSha256 || "não informado no manifesto",
    base_gerada_em: state.manifest.generatedAt,
    recorte_territorial: territory.label,
    periodo_exportado: firstPeriod === lastPeriod ? firstPeriod : `${firstPeriod} a ${lastPeriod}`,
    tipologias: selectedTypes,
    quantidade_linhas: rows.length,
    unidade_observacao: "mês × município ou unidade equivalente × tipologia",
    unidade_prejuizos: "reais (R$)",
    tratamento: "Dados agregados sem correção ou reinterpretação durante a exportação. Células numéricas vazias da fonte foram tratadas na construção da base, conforme a metodologia publicada.",
  };
}

function updateExportEstimate() {
  if (!state.ready || dom.exportModal.classList.contains("is-hidden")) return;
  const rows = collectExportRows();
  dom.exportRowCount.textContent = formatInteger.format(rows.length);
  dom.confirmExport.disabled = rows.length === 0 || state.exportGenerating;
  dom.exportStatus.classList.toggle("is-error", rows.length === 0);
  dom.exportStatus.textContent = rows.length === 0
    ? "Nenhum registro corresponde aos filtros escolhidos."
    : "";
}

function openExportDialog() {
  if (!state.ready || state.exportGenerating) return;
  const territory = exportTerritory();
  const typeCount = state.activeTypes.size;
  state.exportReturnFocus = document.activeElement;
  dom.exportTerritory.textContent = territory.label;
  dom.exportTypes.textContent = typeCount === state.types.length
    ? "Todas as 16 tipologias"
    : `${typeCount} ${typeCount === 1 ? "tipologia" : "tipologias"}`;
  dom.exportCurrentPeriod.textContent = periodLabel(state.periods[state.currentPeriod]);
  dom.exportHistoryPeriod.textContent = `${numericPeriodLabel(state.periods[0])} a ${numericPeriodLabel(
    state.periods.at(-1)
  )}`;
  dom.exportModal.classList.remove("is-hidden");
  addPlaybackBlock("export");
  updateExportEstimate();
  dom.closeExport.focus();
}

function closeExportDialog() {
  if (state.exportGenerating || dom.exportModal.classList.contains("is-hidden")) return;
  dom.exportModal.classList.add("is-hidden");
  dom.exportStatus.textContent = "";
  dom.exportStatus.classList.remove("is-error");
  removePlaybackBlock("export");
  if (state.exportReturnFocus instanceof HTMLElement) {
    state.exportReturnFocus.focus({ preventScroll: true });
  }
  state.exportReturnFocus = null;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function exportFilename(format, mode) {
  const date = new Date();
  const generated = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const period = mode === "history" ? `${state.periods[0]}_${state.periods.at(-1)}` : state.periods[state.currentPeriod];
  return `desastres_${exportTerritory().filename}_${period}_${generated}.${format}`;
}

function generateExportBlob(format, rows, metadata) {
  const fallback = () => {
    if (format === "csv") {
      return new Blob([AtlasExport.csvText(rows)], { type: "text/csv;charset=utf-8" });
    }
    if (format === "json") {
      return new Blob([AtlasExport.jsonText(rows, metadata)], { type: "application/json" });
    }
    if (format === "zip") return AtlasExport.scientificPackageBlob(rows, metadata);
    return AtlasExport.xlsxBlob(rows, metadata);
  };
  if (typeof Worker !== "function") return Promise.resolve(fallback());

  const exporterScript = document.querySelector('script[src*="assets/js/export.js"]');
  const workerPath = exporterScript?.dataset.exportWorker;
  if (!exporterScript?.src || !workerPath) return Promise.resolve(fallback());

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL(workerPath, document.baseURI));
    worker.addEventListener("message", (event) => {
      if (event.data?.type === "progress") {
        dom.exportStatus.textContent = event.data.message;
      } else if (event.data?.type === "complete") {
        worker.terminate();
        resolve(event.data.blob);
      } else if (event.data?.type === "error") {
        worker.terminate();
        reject(new Error(event.data.message));
      }
    });
    worker.addEventListener("error", (event) => {
      worker.terminate();
      reject(new Error(event.message || "Falha no processamento da exportação."));
    });
    worker.postMessage({ exporterUrl: exporterScript.src, format, rows, metadata });
  });
}

async function generateExport() {
  if (state.exportGenerating) return;
  const mode = exportPeriodMode();
  const format = dom.exportFormat.value;
  const rows = collectExportRows(mode);
  if (!rows.length) {
    updateExportEstimate();
    return;
  }

  state.exportGenerating = true;
  dom.confirmExport.disabled = true;
  dom.cancelExport.disabled = true;
  dom.closeExport.disabled = true;
  dom.exportStatus.classList.remove("is-error");
  dom.exportStatus.textContent = `Preparando ${formatInteger.format(rows.length)} linhas…`;
  await new Promise((resolve) => window.setTimeout(resolve, 0));

  try {
    const metadata = exportMetadata(rows, mode);
    const blob = await generateExportBlob(format, rows, metadata);
    downloadBlob(blob, exportFilename(format, mode));
    dom.exportStatus.textContent = "Arquivo gerado. O download foi iniciado.";
  } catch (error) {
    console.error(error);
    dom.exportStatus.classList.add("is-error");
    dom.exportStatus.textContent = "Não foi possível gerar o arquivo. Tente outro formato.";
  } finally {
    state.exportGenerating = false;
    dom.cancelExport.disabled = false;
    dom.closeExport.disabled = false;
    updateExportEstimate();
  }
}

function humanImpactBand(total) {
  if (total >= 10_000) return 4;
  if (total >= 1_000) return 3;
  if (total >= 100) return 2;
  if (total > 0) return 1;
  return 0;
}

function versionedDataUrl(url) {
  if (!state.dataVersion) throw new Error("Versão dos dados ainda não definida.");
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(state.dataVersion)}`;
}

async function fetchJson(url, cache = "default") {
  const response = await fetch(url, { cache });
  if (!response.ok) throw new Error(`${response.status} ao carregar ${url}`);
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

  if (isGzip) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Este navegador não oferece descompactação nativa. Atualize-o para abrir o mapa.");
    }
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).json();
  }
  return JSON.parse(new TextDecoder("utf-8").decode(buffer));
}

function setStatus(kind, text) {
  dom.dataStatus.className = `status-badge is-${kind}`;
  dom.dataStatusText.textContent = text;
}

function updateStatusView(status) {
  switch (status?.status) {
    case "up-to-date":
      return {
        kind: "ready",
        label: "Atlas verificado",
        panelLabel: "Base em dia",
        message: "Nenhuma versão mais recente do Atlas foi encontrada na última verificação.",
      };
    case "update-available":
      return {
        kind: "update",
        label: "Atualização disponível",
        panelLabel: "Revisão necessária",
        message:
          "Uma nova versão do Atlas foi encontrada. A base exibida permanece inalterada até a aprovação da atualização.",
      };
    case "check-failed":
      return {
        kind: "error",
        label: "Verificação atrasada",
        panelLabel: "Não foi possível verificar",
        message:
          "A base publicada continua disponível, mas a consulta mais recente ao Atlas não foi concluída.",
      };
    default:
      return {
        kind: "waiting",
        label: "Verificação pendente",
        panelLabel: "Aguardando primeira verificação",
        message:
          "A base publicada está disponível. A verificação automática semanal será ativada na próxima etapa.",
      };
  }
}

function renderUpdateStatus() {
  if (!state.manifest || !state.updateStatus) return;
  const view = updateStatusView(state.updateStatus);
  setStatus(view.kind, view.label);
  dom.updatePanelState.className = `update-state-chip is-${view.kind}`;
  dom.updatePanelState.textContent = view.panelLabel;
  dom.updateStatusMessage.textContent = view.message;
  dom.publishedVersion.textContent = state.manifest.version;
  dom.publishedCoverage.textContent = `${numericPeriodLabel(
    state.periods[0]
  )} a ${numericPeriodLabel(state.periods.at(-1))}`;
  dom.publishedGeneratedAt.textContent = dateTimeLabel(
    state.manifest.generatedAt,
    "Não informada"
  );
  dom.lastAtlasCheck.textContent = dateTimeLabel(state.updateStatus.checkedAt);

  const hasAvailableVersion =
    state.updateStatus.status === "update-available" && state.updateStatus.availableVersion;
  dom.latestAtlasRow.classList.toggle("is-hidden", !hasAvailableVersion);
  dom.latestAtlasVersion.textContent = hasAvailableVersion
    ? state.updateStatus.availableVersion
    : "—";
}

function setUpdateStatusPanel(open, restoreFocus = false) {
  if (open && dom.dataStatus.disabled) return;
  dom.updateStatusPanel.classList.toggle("is-hidden", !open);
  dom.dataStatus.setAttribute("aria-expanded", String(open));
  if (!open && restoreFocus) dom.dataStatus.focus();
}

function validateUpdateStatus(payload) {
  if (!payload || payload.schemaVersion !== 1 || !UPDATE_STATES.has(payload.status)) {
    throw new Error("Estado de atualização do Atlas inválido.");
  }
  const requiresCheckedAt =
    payload.status === "up-to-date" || payload.status === "update-available";
  if (requiresCheckedAt && !payload.checkedAt) {
    throw new Error("A verificação concluída do Atlas não informa quando ocorreu.");
  }
  if (payload.checkedAt && Number.isNaN(new Date(payload.checkedAt).getTime())) {
    throw new Error("Data da verificação do Atlas inválida.");
  }
  if (payload.status === "update-available") {
    const source = new URL(payload.availableSourceUrl);
    if (
      !payload.availableVersion ||
      source.protocol !== "https:" ||
      source.hostname !== "atlasdigital.mdr.gov.br" ||
      !payload.detectedAt ||
      Number.isNaN(new Date(payload.detectedAt).getTime())
    ) {
      throw new Error("A atualização encontrada não possui metadados auditáveis.");
    }
  }
  return payload;
}

async function loadUpdateStatus() {
  try {
    return validateUpdateStatus(await fetchJson(UPDATE_STATUS_URL, "no-store"));
  } catch (error) {
    console.warn(error);
    return {
      schemaVersion: 1,
      status: "check-failed",
      checkedAt: null,
      availableVersion: null,
      availableSourceUrl: null,
      detectedAt: null,
    };
  }
}

function showFatalError(error) {
  console.error(error);
  setStatus("error", "Falha no carregamento");
  dom.loadingTitle.textContent = "Não foi possível abrir o mapa";
  dom.loadingMessage.textContent =
    "Confira a conexão e se a pasta data foi enviada junto com o index.html.";
  dom.retryButton.classList.remove("is-hidden");
  dom.loadingOverlay.classList.remove("is-hidden");
}

function validatePayloads(manifest, summary, geometry) {
  if (!Array.isArray(manifest.periods) || manifest.periods.length < 420) {
    throw new Error("Manifesto sem a série mensal completa esperada.");
  }
  if (!Array.isArray(manifest.types) || manifest.types.length !== 16) {
    throw new Error("Manifesto sem as 16 tipologias oficiais.");
  }
  if (!Array.isArray(summary.rows) || !Array.isArray(geometry.features)) {
    throw new Error("Arquivos de dados inválidos.");
  }
}

function indexData(manifest, summary, geometry) {
  state.manifest = manifest;
  state.periods = manifest.periods;
  state.types = manifest.types;
  state.summaryByPeriod = Array.from({ length: state.periods.length }, () => []);
  for (const row of summary.rows) state.summaryByPeriod[row[SUMMARY.period]].push(row);

  for (const feature of geometry.features) {
    const properties = feature.properties;
    const code = String(properties.cd);
    state.municipalityByCode.set(code, {
      code,
      name: properties.nm,
      uf: String(properties.uf).toUpperCase(),
    });
  }

  state.municipalitySearchIndex = [...state.municipalityByCode.values()]
    .map((municipality) => ({
      ...municipality,
      searchName: normalizeSearchText(municipality.name),
    }))
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, "pt-BR") || a.uf.localeCompare(b.uf, "pt-BR")
    );

  state.geometryCache.set("BR", geometry);
  state.activeTypes = new Set(state.types.map((type) => type.id));
  const firstYear = state.periods[0].slice(0, 4);
  const lastYear = state.periods.at(-1).slice(0, 4);
  dom.brandCoverage.textContent = `Atlas brasileiro · ${firstYear}–${lastYear}`;
}

function buildUfSelector() {
  const options = Object.entries(UF_NAMES)
    .map(([uf, name]) => `<option value="${uf}">${escapeHtml(name)}${uf === "BR" ? " inteiro" : ` — ${uf}`}</option>`)
    .join("");
  dom.ufSelector.innerHTML = options;
  dom.ufSelector.value = "BR";
  dom.ufSelector.disabled = false;
}

function buildTypeFilters() {
  const typesByName = new Map(state.types.map((type) => [type.name, type]));
  const groupedNames = new Set(TYPE_GROUPS.flatMap((group) => group.typeNames));
  if (groupedNames.size !== state.types.length || state.types.some((type) => !groupedNames.has(type.name))) {
    throw new Error("A organização dos grupos não corresponde às 16 tipologias oficiais.");
  }

  dom.typeList.innerHTML = TYPE_GROUPS.map((group) => {
    const items = group.typeNames.map((name) => {
      const type = typesByName.get(name);
      if (!type) throw new Error(`Tipologia ausente no grupo ${group.label}: ${name}`);
      return `
        <label class="type-item" title="${escapeHtml(type.name)}">
          <input type="checkbox" value="${type.id}" data-type-id="${type.id}" checked>
          <span class="type-swatch" style="background:${type.color}" aria-hidden="true"></span>
          <span>${escapeHtml(type.name)}</span>
          <span class="type-total">${formatCompact.format(type.events)}</span>
        </label>`;
    }).join("");

    return `
      <section class="type-group" data-type-group-section="${group.id}" aria-labelledby="type-group-${group.id}">
        <label class="type-group-toggle" id="type-group-${group.id}">
          <input type="checkbox" value="${group.id}" data-type-group="${group.id}" checked>
          <span>${escapeHtml(group.label)}</span>
          <span class="type-group-count" data-type-group-count="${group.id}">${group.typeNames.length}/${group.typeNames.length}</span>
        </label>
        <div class="type-group-items">${items}</div>
      </section>`;
  }).join("");
  syncTypeGroupStates();
}

function typeIdsForGroup(groupId) {
  const group = TYPE_GROUPS.find((candidate) => candidate.id === groupId);
  if (!group) return [];
  const idsByName = new Map(state.types.map((type) => [type.name, type.id]));
  return group.typeNames.map((name) => idsByName.get(name)).filter(Number.isInteger);
}

function syncTypeGroupStates() {
  for (const group of TYPE_GROUPS) {
    const input = dom.typeList.querySelector(`input[data-type-group="${group.id}"]`);
    const count = dom.typeList.querySelector(`[data-type-group-count="${group.id}"]`);
    if (!input || !count) continue;
    const typeIds = typeIdsForGroup(group.id);
    const selected = typeIds.filter((typeId) => state.activeTypes.has(typeId)).length;
    input.checked = selected === typeIds.length;
    input.indeterminate = selected > 0 && selected < typeIds.length;
    count.textContent = `${selected}/${typeIds.length}`;
    input.setAttribute("aria-label", `${group.label}: ${selected} de ${typeIds.length} selecionadas`);
  }
}

function layerStyle(aggregate, hovered = false, located = false) {
  if (!aggregate) {
    if (!hovered && !located) return EMPTY_STYLE;
    return {
      ...EMPTY_STYLE,
      color: hovered ? "#ffffff" : "#42d6e8",
      weight: located ? 4 : 2,
      opacity: 0.95,
    };
  }

  const type = state.types[aggregate.dominantType];
  const multiple = aggregate.typeCount > 1;
  const band = humanImpactBand(aggregate.human);
  return {
    color: hovered ? "#ffffff" : located ? "#42d6e8" : multiple ? "#ffd166" : "#d9edf4",
    weight: hovered ? 3.2 : located ? 4 : 1.05 + band * 0.38,
    opacity: hovered ? 1 : multiple ? 0.98 : 0.84,
    fillColor: type.color,
    fillOpacity: hovered ? 0.92 : 0.79,
    dashArray: multiple && !hovered ? "5 3" : null,
  };
}

function municipalityLayerStyle(code, aggregate = state.currentAggregates.get(code), hovered = false) {
  return layerStyle(aggregate, hovered, state.locatedMunicipalityCode === code);
}

function renderGeography(geometry, fitBounds = false) {
  closeMapTooltip();
  if (state.geoLayer) map.removeLayer(state.geoLayer);
  state.layerByCode.clear();
  state.previousStyledCodes.clear();

  state.geoLayer = L.geoJSON(geometry, {
    renderer: mapRenderer,
    style: EMPTY_STYLE,
    onEachFeature(feature, layer) {
      const properties = feature.properties;
      const code = String(properties.cd);
      state.layerByCode.set(code, layer);
      if (!state.municipalityByCode.has(code)) {
        state.municipalityByCode.set(code, {
          code,
          name: properties.nm,
          uf: String(properties.uf).toUpperCase(),
        });
      }
      layer.on({
        mouseover: (event) => handleMunicipalityHover(event, code),
        mousemove: (event) => handleMunicipalityMove(event, code),
        mouseout: () => handleMunicipalityOut(code),
        click: () => openMunicipalityDetail(code),
      });
    },
  }).addTo(map);

  if (fitBounds) {
    map.fitBounds(state.geoLayer.getBounds(), {
      padding: [18, 18],
      animate: false,
    });
  }
}

function chooseDominant(current, candidate) {
  if (!current) return candidate;
  if (candidate.human !== current.human) return candidate.human > current.human ? candidate : current;
  if (candidate.events !== current.events) return candidate.events > current.events ? candidate : current;
  return candidate.type < current.type ? candidate : current;
}

function calculatePeriod(periodIndex) {
  const aggregates = new Map();
  const tableRows = [];

  for (const row of state.summaryByPeriod[periodIndex]) {
    if (!state.activeTypes.has(row[SUMMARY.type])) continue;
    const meta = state.municipalityByCode.get(String(row[SUMMARY.code]));
    if (!meta || (state.scopeUF !== "BR" && meta.uf !== state.scopeUF)) continue;

    const code = meta.code;
    let aggregate = aggregates.get(code);
    if (!aggregate) {
      aggregate = {
        code,
        name: meta.name,
        uf: meta.uf,
        events: 0,
        human: 0,
        deaths: 0,
        injured: 0,
        sick: 0,
        homeless: 0,
        displaced: 0,
        missing: 0,
        drought: 0,
        other: 0,
        publicLoss: 0,
        privateLoss: 0,
        typeCount: 0,
        dominantType: row[SUMMARY.type],
        dominant: null,
      };
      aggregates.set(code, aggregate);
    }

    aggregate.events += row[SUMMARY.events];
    aggregate.human += row[SUMMARY.human];
    aggregate.deaths += row[SUMMARY.deaths];
    aggregate.injured += row[SUMMARY.injured];
    aggregate.sick += row[SUMMARY.sick];
    aggregate.homeless += row[SUMMARY.homeless];
    aggregate.displaced += row[SUMMARY.displaced];
    aggregate.missing += row[SUMMARY.missing];
    aggregate.drought += row[SUMMARY.drought];
    aggregate.other += row[SUMMARY.other];
    aggregate.publicLoss += row[SUMMARY.publicLoss];
    aggregate.privateLoss += row[SUMMARY.privateLoss];
    aggregate.typeCount += 1;
    aggregate.dominant = chooseDominant(aggregate.dominant, {
      type: row[SUMMARY.type],
      human: row[SUMMARY.human],
      events: row[SUMMARY.events],
    });
    aggregate.dominantType = aggregate.dominant.type;

    tableRows.push({
      meta,
      type: row[SUMMARY.type],
      events: row[SUMMARY.events],
      human: row[SUMMARY.human],
    });
  }

  tableRows.sort(
    (a, b) =>
      b.human - a.human ||
      b.events - a.events ||
      a.meta.name.localeCompare(b.meta.name, "pt-BR") ||
      a.type - b.type
  );
  return { aggregates, tableRows };
}

function updateMapStyles(aggregates) {
  const changed = new Set([
    ...state.previousStyledCodes,
    ...aggregates.keys(),
    state.locatedMunicipalityCode,
  ]);
  for (const code of changed) {
    if (!code) continue;
    const layer = state.layerByCode.get(code);
    if (layer) layer.setStyle(municipalityLayerStyle(code, aggregates.get(code)));
  }
  state.previousStyledCodes = new Set(aggregates.keys());

  if (state.hovered) {
    const layer = state.layerByCode.get(state.hovered.code);
    if (layer) layer.setStyle(municipalityLayerStyle(state.hovered.code, aggregates.get(state.hovered.code), true));
  }
}

function sumAggregates(aggregates) {
  const totals = {
    events: 0,
    human: 0,
    deaths: 0,
    injured: 0,
    sick: 0,
    homeless: 0,
    displaced: 0,
    missing: 0,
    drought: 0,
    other: 0,
    publicLoss: 0,
    privateLoss: 0,
  };
  for (const aggregate of aggregates.values()) {
    for (const key of Object.keys(totals)) totals[key] += aggregate[key];
  }
  return totals;
}

function emptyTemporalEntry() {
  return {
    events: 0,
    human: 0,
    publicLoss: 0,
    privateLoss: 0,
  };
}

function buildTemporalSeries() {
  const series = Array.from({ length: state.periods.length }, emptyTemporalEntry);
  const municipalityMode = state.temporalContext === "municipality";
  const stateMode = state.temporalContext === "state";
  const municipalityCode = state.temporalMunicipalityCode;
  const stateUf = state.temporalStateUF;

  for (let periodIndex = 0; periodIndex < state.summaryByPeriod.length; periodIndex += 1) {
    const entry = series[periodIndex];
    for (const row of state.summaryByPeriod[periodIndex]) {
      if (!state.activeTypes.has(row[SUMMARY.type])) continue;
      const code = String(row[SUMMARY.code]);
      const meta = state.municipalityByCode.get(code);
      if (!meta) continue;
      if (municipalityMode) {
        if (!municipalityCode || code !== municipalityCode) continue;
      } else if (stateMode && (!stateUf || meta.uf !== stateUf)) {
        continue;
      }

      entry.events += row[SUMMARY.events];
      entry.human += row[SUMMARY.human];
      entry.publicLoss += row[SUMMARY.publicLoss];
      entry.privateLoss += row[SUMMARY.privateLoss];
    }
  }
  return series;
}

function temporalEntryValue(entry, metric = state.temporalMetric) {
  if (!entry) return 0;
  if (metric === "loss") return entry.publicLoss + entry.privateLoss;
  return entry[metric];
}

function temporalAxisValue(value) {
  if (state.temporalMetric === "loss") return formatCurrency.format(value);
  return formatCompact.format(value);
}

function temporalContextText() {
  const selectedCount = state.activeTypes.size;
  const typeText =
    selectedCount === 0
      ? "nenhuma tipologia"
      : `${selectedCount} ${selectedCount === 1 ? "tipologia" : "tipologias"}`;
  if (state.temporalContext === "municipality" && state.temporalMunicipalityCode) {
    const meta = state.municipalityByCode.get(state.temporalMunicipalityCode);
    if (meta) return `Município · ${meta.name} — ${meta.uf} · ${typeText}`;
  }
  if (state.temporalContext === "state" && state.temporalStateUF) {
    return `Estado · ${UF_NAMES[state.temporalStateUF]} — ${state.temporalStateUF} · ${typeText}`;
  }
  return `Brasil · ${typeText}`;
}

function syncTemporalControls() {
  const municipality = state.temporalMunicipalityCode
    ? state.municipalityByCode.get(state.temporalMunicipalityCode)
    : null;
  dom.temporalState.textContent = state.temporalStateUF
    ? `${UF_NAMES[state.temporalStateUF]} — ${state.temporalStateUF}`
    : "Selecionar estado";
  dom.temporalMunicipality.textContent = municipality
    ? `${municipality.name} — ${municipality.uf}`
    : "Selecionar município";

  for (const button of [dom.temporalBrazil, dom.temporalState, dom.temporalMunicipality]) {
    const active = button.dataset.temporalContext === state.temporalContext;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  for (const button of document.querySelectorAll("[data-temporal-metric]")) {
    const active = button.dataset.temporalMetric === state.temporalMetric;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  dom.temporalContextLabel.textContent = temporalContextText();
}

function syncMapScaleOffset() {
  const attribution = dom.mapStage.querySelector(".leaflet-control-attribution");
  const creditHeight = attribution?.getBoundingClientRect().height || 18;
  const offset = Math.ceil(creditHeight + MAP_SCALE_CREDIT_GAP);
  dom.mapStage.style.setProperty("--map-scale-bottom", `${offset}px`);
}

function observeMapCreditsSize() {
  syncMapScaleOffset();
  if (typeof ResizeObserver !== "function") return;
  const attribution = dom.mapStage.querySelector(".leaflet-control-attribution");
  if (!attribution) return;
  state.mapCreditsResizeObserver = new ResizeObserver(syncMapScaleOffset);
  state.mapCreditsResizeObserver.observe(attribution);
}

function setTemporalAnalysisExpanded(expanded, syncUrl = true) {
  state.temporalExpanded = Boolean(expanded);
  dom.temporalAnalysis.hidden = !state.temporalExpanded;
  dom.toggleTemporalAnalysis.setAttribute("aria-expanded", String(state.temporalExpanded));
  dom.toggleTemporalAnalysis.textContent = state.temporalExpanded
    ? "Fechar série temporal"
    : "Abrir série temporal";
  dom.mapStage.classList.toggle("temporal-analysis-open", state.temporalExpanded);
  dom.toggleTemporalAnalysis.closest(".timeline").classList.toggle(
    "is-analysis-expanded",
    state.temporalExpanded
  );
  window.requestAnimationFrame(() => {
    syncMapScaleOffset();
    if (state.temporalExpanded) drawTemporalChart();
  });
  if (syncUrl) syncViewUrl();
}

function setTemporalMetric(metric) {
  if (!Object.hasOwn(TEMPORAL_METRICS, metric) || metric === state.temporalMetric) return;
  state.temporalMetric = metric;
  syncTemporalControls();
  drawTemporalChart();
  syncViewUrl();
}

function setTemporalContext(context) {
  if (context === "municipality" && !state.temporalMunicipalityCode) {
    openMunicipalitySearch();
    return;
  }
  if (context === "state" && !state.temporalStateUF) {
    dom.ufSelector.focus();
    if (typeof dom.ufSelector.showPicker === "function") {
      try {
        dom.ufSelector.showPicker();
      } catch (error) {
        console.debug("O seletor de UF recebeu foco, mas o navegador não abriu a lista.", error);
      }
    }
    return;
  }
  const nextContext = ["brazil", "state", "municipality"].includes(context)
    ? context
    : "brazil";
  if (nextContext === state.temporalContext) return;
  state.temporalContext = nextContext;
  refreshTemporalSeries();
  syncViewUrl();
}

function setTemporalMunicipality(code, select = true) {
  const nextCode = code && state.municipalityByCode.has(String(code)) ? String(code) : null;
  state.temporalMunicipalityCode = nextCode;
  if (nextCode) {
    const municipality = state.municipalityByCode.get(nextCode);
    if (municipality && state.scopeUF === "BR") state.temporalStateUF = municipality.uf;
    if (select) state.temporalContext = "municipality";
  }
  if (!nextCode && state.temporalContext === "municipality") {
    state.temporalContext = state.temporalStateUF ? "state" : "brazil";
  }
  if (state.ready) refreshTemporalSeries();
  else syncTemporalControls();
  syncViewUrl();
}

function refreshTemporalSeries() {
  if (!state.ready) return;
  state.temporalSeries = buildTemporalSeries();
  syncTemporalControls();
  drawTemporalChart();
}

function temporalTooltipContent(periodIndex) {
  const entry = state.temporalSeries[periodIndex] || emptyTemporalEntry();
  const value = temporalEntryValue(entry);
  const period = periodLabel(state.periods[periodIndex]);
  let valueText;
  let detailText = "";

  if (entry.events <= 0) {
    valueText = "Sem ocorrência";
    detailText = "Nenhum evento corresponde aos filtros deste mês.";
  } else if (state.temporalMetric !== "events" && value <= 0) {
    valueText = "Sem valor positivo registrado";
    detailText = `${formatInteger.format(entry.events)} ${entry.events === 1 ? "ocorrência" : "ocorrências"} no mês.`;
  } else if (state.temporalMetric === "events") {
    valueText = `${formatInteger.format(value)} ${value === 1 ? "ocorrência" : "ocorrências"}`;
  } else if (state.temporalMetric === "human") {
    valueText = `${formatInteger.format(value)} danos humanos`;
  } else {
    valueText = formatCurrency.format(value);
    detailText = `Público: ${formatCurrency.format(entry.publicLoss)} · Privado: ${formatCurrency.format(
      entry.privateLoss
    )}`;
  }
  return { period, valueText, detailText };
}

function renderTemporalTooltip(periodIndex, announce = false) {
  const content = temporalTooltipContent(periodIndex);
  const title = document.createElement("strong");
  title.textContent = content.period;
  const value = document.createElement("span");
  value.textContent = content.valueText;
  dom.temporalChartTooltip.replaceChildren(title, value);
  if (content.detailText) {
    const detail = document.createElement("small");
    detail.textContent = content.detailText;
    dom.temporalChartTooltip.append(detail);
  }
  if (announce) {
    dom.temporalChartStatus.textContent = `${content.period}: ${content.valueText}${
      content.detailText ? `. ${content.detailText}` : ""
    }`;
  }
}

function updateTemporalChartSelection() {
  const geometry = state.temporalChartGeometry;
  if (!geometry || !state.temporalSeries.length) return;
  const periodIndex = state.currentPeriod;
  const entry = state.temporalSeries[periodIndex] || emptyTemporalEntry();
  const value = temporalEntryValue(entry);
  const x = geometry.left + (periodIndex / Math.max(1, state.periods.length - 1)) * geometry.plotWidth;
  const y = geometry.top + geometry.plotHeight - (value / geometry.maxValue) * geometry.plotHeight;
  const guide = dom.temporalChart.querySelector("#temporalCurrentGuide");
  const marker = dom.temporalChart.querySelector("#temporalCurrentMarker");
  if (guide) {
    guide.setAttribute("x1", x.toFixed(2));
    guide.setAttribute("x2", x.toFixed(2));
  }
  if (marker) {
    marker.setAttribute("cx", x.toFixed(2));
    marker.setAttribute("cy", y.toFixed(2));
  }
  dom.temporalChart.setAttribute("aria-valuenow", String(periodIndex));
  dom.temporalChart.setAttribute("aria-valuetext", periodLabel(state.periods[periodIndex]));
  renderTemporalTooltip(periodIndex, !state.playbackWanted);
}

function drawTemporalChart() {
  cancelAnimationFrame(state.temporalFrame);
  state.temporalFrame = window.requestAnimationFrame(() => {
    if (!state.temporalExpanded || !state.temporalSeries.length) return;
    const container = dom.temporalChart.parentElement;
    const width = Math.max(280, container.clientWidth);
    const height = Math.max(150, container.clientHeight);
    const left = width < 480 ? 62 : 72;
    const right = 14;
    const top = TEMPORAL_CHART_TOP;
    const bottom = 28;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const values = state.temporalSeries.map((entry) => temporalEntryValue(entry));
    const observedMaximum = Math.max(0, ...values);
    const maxValue = observedMaximum > 0 ? observedMaximum * 1.08 : 1;
    const x = (index) => left + (index / Math.max(1, values.length - 1)) * plotWidth;
    const y = (value) => top + plotHeight - (value / maxValue) * plotHeight;
    const linePath = values
      .map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)} ${y(value).toFixed(2)}`)
      .join(" ");
    const areaPath = `M${left} ${top + plotHeight} ${linePath.replace(/^M/, "L")} L${
      left + plotWidth
    } ${top + plotHeight} Z`;
    const lastPeriodIndex = state.periods.length - 1;
    const tickCount = width < 480 ? 4 : 5;
    const xTicks = Array.from({ length: tickCount }, (_, index) =>
      Math.round((index / (tickCount - 1)) * lastPeriodIndex)
    );
    const yTicks = [0, 0.5, 1];

    state.temporalChartGeometry = { width, left, top, plotWidth, plotHeight, maxValue };
    dom.temporalChart.setAttribute("viewBox", `0 0 ${width} ${height}`);
    dom.temporalChart.innerHTML = `
      <rect class="temporal-chart-frame" x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}"></rect>
      ${yTicks
        .map((tick) => {
          const tickY = top + plotHeight - tick * plotHeight;
          return `<line class="temporal-grid-line" x1="${left}" y1="${tickY}" x2="${
            left + plotWidth
          }" y2="${tickY}"></line><text class="temporal-axis-label" x="${left - 8}" y="${
            tickY + 4
          }" text-anchor="end">${escapeHtml(temporalAxisValue(maxValue * tick))}</text>`;
        })
        .join("")}
      <path class="temporal-area" d="${areaPath}"></path>
      <path class="temporal-line" d="${linePath}"></path>
      <line id="temporalCurrentGuide" class="temporal-current-guide" y1="${top}" y2="${
        top + plotHeight
      }"></line>
      <circle id="temporalCurrentMarker" class="temporal-current-marker" r="4.5"></circle>
      <line id="temporalHoverGuide" class="temporal-hover-guide" y1="${top}" y2="${
        top + plotHeight
      }" hidden></line>
      ${xTicks
        .map((tick, index) => {
          const anchor = index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle";
          return `<text class="temporal-axis-label" x="${x(tick)}" y="${height - 8}" text-anchor="${anchor}">${escapeHtml(
            state.periods[tick].slice(0, 4)
          )}</text>`;
        })
        .join("")}
      <text class="temporal-axis-title" x="12" y="13">${escapeHtml(
        TEMPORAL_METRICS[state.temporalMetric].axisLabel
      )}</text>
      <rect class="temporal-chart-hit" x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}"></rect>`;
    updateTemporalChartSelection();
  });
}

function temporalIndexFromPointer(event) {
  const geometry = state.temporalChartGeometry;
  if (!geometry) return state.currentPeriod;
  const bounds = dom.temporalChart.getBoundingClientRect();
  const localX = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * geometry.width;
  const ratio = (localX - geometry.left) / geometry.plotWidth;
  return Math.max(0, Math.min(state.periods.length - 1, Math.round(ratio * (state.periods.length - 1))));
}

function previewTemporalIndex(periodIndex) {
  const guide = dom.temporalChart.querySelector("#temporalHoverGuide");
  const geometry = state.temporalChartGeometry;
  if (!guide || !geometry) return;
  const x = geometry.left + (periodIndex / Math.max(1, state.periods.length - 1)) * geometry.plotWidth;
  guide.hidden = false;
  guide.setAttribute("x1", x.toFixed(2));
  guide.setAttribute("x2", x.toFixed(2));
  renderTemporalTooltip(periodIndex);
}

function renderIndicators(aggregates) {
  const totals = sumAggregates(aggregates);
  dom.kpiEvents.textContent = formatInteger.format(totals.events);
  dom.kpiMunicipalities.textContent = formatInteger.format(aggregates.size);
  dom.kpiHuman.textContent = formatCompact.format(totals.human);
  dom.kpiHuman.title = formatInteger.format(totals.human);
  dom.kpiDeaths.textContent = formatInteger.format(totals.deaths);
  dom.damageInjured.textContent = formatInteger.format(totals.injured + totals.sick);
  dom.damageHomeless.textContent = formatInteger.format(totals.homeless);
  dom.damageDisplaced.textContent = formatInteger.format(totals.displaced);
  dom.damageAffected.textContent = formatInteger.format(
    totals.missing + totals.drought + totals.other
  );
  dom.damagePublic.textContent = formatCurrency.format(totals.publicLoss);
  dom.damagePrivate.textContent = formatCurrency.format(totals.privateLoss);
  dom.damagePublic.title = formatInteger.format(totals.publicLoss);
  dom.damagePrivate.title = formatInteger.format(totals.privateLoss);
}

function updateVirtualTable(tableRows) {
  state.tableRows = tableRows;
  dom.resultsViewport.scrollTop = 0;
  dom.resultsCanvas.style.height = `${tableRows.length * ROW_HEIGHT}px`;
  dom.resultCount.textContent = `${formatInteger.format(tableRows.length)} ${
    tableRows.length === 1 ? "resultado" : "resultados"
  }`;
  dom.emptyResults.classList.toggle("is-hidden", tableRows.length > 0);
  dom.resultsViewport.classList.toggle("is-hidden", tableRows.length === 0);
  renderVirtualRows();
}

function renderVirtualRows() {
  cancelAnimationFrame(state.tableFrame);
  state.tableFrame = requestAnimationFrame(() => {
    const rows = state.tableRows;
    const visibleHeight = dom.resultsViewport.clientHeight || 260;
    const effectiveScroll = Math.max(0, dom.resultsViewport.scrollTop - TABLE_HEADER_HEIGHT);
    const start = Math.max(0, Math.floor(effectiveScroll / ROW_HEIGHT) - 5);
    const count = Math.ceil(visibleHeight / ROW_HEIGHT) + 10;
    const end = Math.min(rows.length, start + count);
    let html = "";

    for (let index = start; index < end; index += 1) {
      const row = rows[index];
      const type = state.types[row.type];
      html += `
        <div class="virtual-row" role="row" style="transform:translateY(${index * ROW_HEIGHT}px)">
          <span class="cell-name" role="cell" title="${escapeHtml(row.meta.name)} — ${row.meta.uf}">${escapeHtml(row.meta.name)}</span>
          <span class="cell-type" role="cell" title="${escapeHtml(type.name)}">
            <i class="type-swatch" style="background:${type.color}" aria-hidden="true"></i>
            <span class="cell-type">${escapeHtml(type.name)}</span>
          </span>
          <span class="cell-number" role="cell">${formatInteger.format(row.events)}</span>
          <span class="cell-number" role="cell" title="${formatInteger.format(row.human)}">${formatCompact.format(row.human)}</span>
        </div>`;
    }
    dom.resultsCanvas.innerHTML = html;
  });
}

function setPeriod(index) {
  if (!state.ready) return;
  const bounded = Math.max(0, Math.min(state.periods.length - 1, Number(index)));
  state.currentPeriod = bounded;
  const period = state.periods[bounded];
  const label = periodLabel(period);
  const numericLabel = numericPeriodLabel(period);
  const { aggregates, tableRows } = calculatePeriod(bounded);
  state.currentAggregates = aggregates;

  updateMapStyles(aggregates);
  renderIndicators(aggregates);
  updateVirtualTable(tableRows);

  dom.periodSlider.value = String(bounded);
  dom.displayPeriod.textContent = numericLabel;
  dom.kpiPeriod.textContent = label;
  dom.resultsPeriod.textContent = label;
  updateTemporalChartSelection();

  if (state.hovered && municipalityTooltip._map) {
    municipalityTooltip.setContent(tooltipContent(state.hovered.code));
  }
  if (state.locatedMunicipalityCode && municipalityLocatorPopup._map) {
    municipalityLocatorPopup.setContent(
      municipalityLocatorSummary(state.locatedMunicipalityCode)
    );
  }
  syncViewUrl();
}

function tooltipContent(code) {
  const meta = state.municipalityByCode.get(code);
  const aggregate = state.currentAggregates.get(code);
  const title = `<strong class="tooltip-title">${escapeHtml(meta.name)} — ${meta.uf}</strong>`;
  if (!aggregate) {
    return `${title}<span class="tooltip-empty">Sem ocorrência para os filtros em ${escapeHtml(
      periodLabel(state.periods[state.currentPeriod], true)
    )}.</span>`;
  }
  const type = state.types[aggregate.dominantType];
  return `${title}
    <span class="tooltip-meta">${formatInteger.format(aggregate.events)} ${
      aggregate.events === 1 ? "evento" : "eventos"
    } · ${formatInteger.format(aggregate.human)} danos humanos</span>
    <span class="tooltip-type"><i class="tooltip-dot" style="background:${type.color}"></i>${escapeHtml(
      type.name
    )}</span>
    <span class="tooltip-meta">Clique para abrir os registros completos.</span>`;
}

function municipalityLocatorSummary(code) {
  const meta = state.municipalityByCode.get(code);
  const aggregate = state.currentAggregates.get(code);
  const container = document.createElement("div");
  container.className = "municipality-locator-summary";

  const title = document.createElement("strong");
  title.textContent = `${meta.name} — ${meta.uf}`;
  container.append(title);

  const summary = document.createElement("span");
  if (aggregate) {
    summary.textContent = `${periodLabel(state.periods[state.currentPeriod], true)} · ${formatInteger.format(
      aggregate.events
    )} ${aggregate.events === 1 ? "evento" : "eventos"} · ${formatInteger.format(
      aggregate.human
    )} danos humanos`;
  } else {
    summary.textContent = `Sem ocorrência para os filtros em ${periodLabel(
      state.periods[state.currentPeriod],
      true
    )}.`;
  }
  container.append(summary);

  const detailButton = document.createElement("button");
  detailButton.className = "municipality-locator-detail";
  detailButton.type = "button";
  detailButton.textContent = "Ver detalhes";
  detailButton.addEventListener("click", () => openMunicipalityDetail(code));
  container.append(detailButton);
  return container;
}

function setLocatedMunicipality(code) {
  const previousCode = state.locatedMunicipalityCode;
  state.locatedMunicipalityCode = code;

  for (const changedCode of new Set([previousCode, code])) {
    if (!changedCode) continue;
    const layer = state.layerByCode.get(changedCode);
    if (layer) layer.setStyle(municipalityLayerStyle(changedCode));
  }

  const meta = code ? state.municipalityByCode.get(code) : null;
  dom.municipalitySearchToggle.classList.toggle("has-selection", Boolean(meta));
  dom.municipalitySearchToggle.setAttribute(
    "aria-label",
    meta ? `Município localizado: ${meta.name} — ${meta.uf}` : "Localizar município"
  );
  if (!state.restoringView) {
    if (code) setTemporalMunicipality(code, true);
    else if (state.temporalMunicipalityCode === previousCode) setTemporalMunicipality(null);
  }
  syncViewUrl();
}

function openMunicipalitySearch() {
  const meta = state.locatedMunicipalityCode
    ? state.municipalityByCode.get(state.locatedMunicipalityCode)
    : null;
  dom.municipalitySearchPanel.hidden = false;
  dom.municipalitySearchToggle.classList.add("is-active");
  dom.municipalitySearchToggle.setAttribute("aria-expanded", "true");
  dom.municipalitySearchInput.value = meta ? `${meta.name} — ${meta.uf}` : "";
  dom.municipalitySearchResults.innerHTML = "";
  dom.municipalitySearchStatus.textContent = meta
    ? `${meta.name} — ${meta.uf} está localizado.`
    : "Digite ao menos duas letras.";
  requestAnimationFrame(() => {
    dom.municipalitySearchInput.focus();
    dom.municipalitySearchInput.select();
  });
}

function closeMunicipalitySearch(returnFocus = false) {
  if (dom.municipalitySearchPanel.hidden) return;
  dom.municipalitySearchPanel.hidden = true;
  dom.municipalitySearchToggle.classList.remove("is-active");
  dom.municipalitySearchToggle.setAttribute("aria-expanded", "false");
  dom.municipalitySearchResults.innerHTML = "";
  if (returnFocus) dom.municipalitySearchToggle.focus();
}

function renderMunicipalitySearchResults() {
  const query = normalizeSearchText(dom.municipalitySearchInput.value);
  dom.municipalitySearchResults.innerHTML = "";

  if (query.length < 2) {
    dom.municipalitySearchStatus.textContent = "Digite ao menos duas letras.";
    return;
  }

  const matches = state.municipalitySearchIndex
    .filter((municipality) => municipality.searchName.includes(query))
    .sort((a, b) => {
      const aStarts = a.searchName.startsWith(query) ? 0 : 1;
      const bStarts = b.searchName.startsWith(query) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name, "pt-BR") || a.uf.localeCompare(b.uf);
    })
    .slice(0, 8);

  dom.municipalitySearchStatus.textContent = matches.length
    ? `${matches.length} ${matches.length === 1 ? "resultado encontrado" : "resultados encontrados"}.`
    : "Nenhum município encontrado.";

  for (const municipality of matches) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.className = "municipality-search-result";
    button.type = "button";
    button.dataset.code = municipality.code;
    button.innerHTML = `<span class="municipality-search-result-name">${escapeHtml(
      municipality.name
    )}</span><span class="municipality-search-result-uf">${municipality.uf}</span>`;
    item.append(button);
    dom.municipalitySearchResults.append(item);
  }
}

async function locateMunicipality(code) {
  if (!state.ready) return;
  const meta = state.municipalityByCode.get(String(code));
  if (!meta) return;

  if (state.scopeUF !== "BR" && state.scopeUF !== meta.uf) {
    dom.ufSelector.value = meta.uf;
    await changeScope(meta.uf);
    if (state.scopeUF !== meta.uf) return;
  }

  setLocatedMunicipality(meta.code);
  closeMunicipalitySearch();

  const layer = state.layerByCode.get(meta.code);
  if (!layer) return;
  layer.setStyle(municipalityLayerStyle(meta.code));
  if (typeof layer.bringToFront === "function") layer.bringToFront();
  map.fitBounds(layer.getBounds(), {
    padding: [54, 54],
    maxZoom: 10,
    animate: false,
  });
  municipalityLocatorPopup
    .setLatLng(layer.getBounds().getCenter())
    .setContent(municipalityLocatorSummary(meta.code))
    .openOn(map);
  bindMunicipalityPopupInteraction();
  scheduleMunicipalityPopupAutoClose();
}

function clearMunicipalityPopupTimers() {
  window.clearTimeout(state.locatorPopupFadeTimer);
  window.clearTimeout(state.locatorPopupCloseTimer);
  state.locatorPopupFadeTimer = null;
  state.locatorPopupCloseTimer = null;
}

function closeMunicipalityPopupImmediately() {
  clearMunicipalityPopupTimers();
  const popupElement = municipalityLocatorPopup.getElement();
  if (popupElement) popupElement.classList.remove("is-fading");
  if (municipalityLocatorPopup._map) municipalityLocatorPopup.removeFrom(map);
}

function scheduleMunicipalityPopupAutoClose() {
  clearMunicipalityPopupTimers();
  const popupElement = municipalityLocatorPopup.getElement();
  if (!municipalityLocatorPopup._map || !popupElement) return;
  popupElement.classList.remove("is-fading");
  state.locatorPopupFadeTimer = window.setTimeout(() => {
    if (!municipalityLocatorPopup._map) return;
    popupElement.classList.add("is-fading");
    state.locatorPopupCloseTimer = window.setTimeout(
      closeMunicipalityPopupImmediately,
      LOCATOR_POPUP_FADE_MS
    );
  }, LOCATOR_POPUP_VISIBLE_MS);
}

function bindMunicipalityPopupInteraction() {
  const popupElement = municipalityLocatorPopup.getElement();
  if (!popupElement) return;
  popupElement.addEventListener("pointerenter", clearMunicipalityPopupTimers);
  popupElement.addEventListener("pointerleave", scheduleMunicipalityPopupAutoClose);
}

function clearLocatedMunicipality() {
  const previousCode = state.locatedMunicipalityCode;
  setLocatedMunicipality(null);
  closeMunicipalityPopupImmediately();
  dom.municipalitySearchInput.value = "";
  dom.municipalitySearchResults.innerHTML = "";
  dom.municipalitySearchStatus.textContent = "Digite ao menos duas letras.";
  if (previousCode) {
    const layer = state.layerByCode.get(previousCode);
    if (layer) layer.setStyle(municipalityLayerStyle(previousCode));
  }
  dom.municipalitySearchInput.focus();
}

function handleMunicipalityHover(event, code) {
  clearTimeout(state.hoverTimer);
  const previous = state.hovered?.code;
  if (previous && previous !== code) {
    const previousLayer = state.layerByCode.get(previous);
    if (previousLayer) previousLayer.setStyle(municipalityLayerStyle(previous));
  }
  state.hovered = { code, latlng: event.latlng };
  event.target.setStyle(municipalityLayerStyle(code, state.currentAggregates.get(code), true));
  const delay = state.playbackWanted ? 140 : 0;
  state.hoverTimer = window.setTimeout(() => {
    if (!state.hovered || state.hovered.code !== code) return;
    municipalityTooltip.setLatLng(state.hovered.latlng).setContent(tooltipContent(code)).addTo(map);
  }, delay);
}

function handleMunicipalityMove(event, code) {
  if (!state.hovered || state.hovered.code !== code) return;
  state.hovered.latlng = event.latlng;
  if (municipalityTooltip._map) municipalityTooltip.setLatLng(event.latlng);
}

function handleMunicipalityOut(code) {
  clearTimeout(state.hoverTimer);
  const layer = state.layerByCode.get(code);
  if (layer) layer.setStyle(municipalityLayerStyle(code));
  if (state.hovered?.code === code) state.hovered = null;
  closeMapTooltip();
}

function closeMapTooltip() {
  clearTimeout(state.hoverTimer);
  const hoveredCode = state.hovered?.code;
  if (hoveredCode) {
    const layer = state.layerByCode.get(hoveredCode);
    if (layer) layer.setStyle(municipalityLayerStyle(hoveredCode));
  }
  if (municipalityTooltip._map) municipalityTooltip.removeFrom(map);
  state.hovered = null;
}

function eventFileUrl(uf) {
  return versionedDataUrl(state.manifest.files.stateEventsPattern.replace("{UF}", uf));
}

function loadStateEvents(uf) {
  if (!state.eventCache.has(uf)) {
    state.eventCache.set(uf, fetchJson(eventFileUrl(uf)).catch((error) => {
      state.eventCache.delete(uf);
      throw error;
    }));
  }
  return state.eventCache.get(uf);
}

async function openMunicipalityDetail(code) {
  if (!state.ready) return;
  closeMapTooltip();
  if (!state.restoringView) setTemporalMunicipality(code, true);
  const meta = state.municipalityByCode.get(code);
  const periodIndex = state.currentPeriod;
  const period = state.periods[periodIndex];
  const selectedTypes = new Set(state.activeTypes);
  const aggregate = state.currentAggregates.get(code);

  state.detailSnapshot = { code, periodIndex, selectedTypes };
  addPlaybackBlock("detail");
  dom.detailEyebrow.textContent = `${periodLabel(period)} · ${UF_NAMES[meta.uf]}`;
  dom.detailTitle.textContent = `${meta.name} — ${meta.uf}`;
  dom.detailContent.innerHTML = aggregate
    ? '<div class="modal-loading"><span>Carregando os registros completos…</span></div>'
    : '<div class="modal-empty">Este município não possui ocorrência para os filtros e o mês selecionados.</div>';
  dom.detailModal.classList.remove("is-hidden");
  dom.closeDetail.focus();
  syncViewUrl();

  if (!aggregate) return;

  try {
    const payload = await loadStateEvents(meta.uf);
    if (state.detailSnapshot?.code !== code || state.detailSnapshot?.periodIndex !== periodIndex) return;
    const rows = payload.rows.filter(
      (row) =>
        row[EVENT.period] === periodIndex &&
        String(row[EVENT.code]) === code &&
        selectedTypes.has(row[EVENT.type])
    );
    renderEventDetails(rows);
  } catch (error) {
    console.error(error);
    dom.detailContent.innerHTML =
      '<div class="modal-empty">Não foi possível carregar os detalhes desta UF. Tente novamente.</div>';
  }
}

function financialImpactBand(value) {
  if (value <= 100_000) return "low";
  if (value <= 1_000_000) return "moderate";
  if (value <= 10_000_000) return "high";
  return "very-high";
}

function detailMetric(label, value, { formatter = formatInteger, typeColor = null, financial = false } = {}) {
  const classes = ["event-metric"];
  let style = "";

  if (value > 0 && typeColor) {
    classes.push("event-metric--human-positive");
    style = ` style="--event-color:${escapeHtml(typeColor)}"`;
  } else if (value > 0 && financial) {
    classes.push("event-metric--financial", `event-metric--financial-${financialImpactBand(value)}`);
  }

  return `<div class="${classes.join(" ")}"${style}><span>${escapeHtml(
    label
  )}</span><strong>${escapeHtml(formatter.format(value))}</strong></div>`;
}

function renderEventDetails(rows) {
  if (!rows.length) {
    dom.detailContent.innerHTML =
      '<div class="modal-empty">Nenhum registro detalhado corresponde aos filtros atuais.</div>';
    return;
  }

  const totalHuman = rows.reduce((sum, row) => sum + row[EVENT.human], 0);
  const totalLoss = rows.reduce(
    (sum, row) => sum + row[EVENT.publicLoss] + row[EVENT.privateLoss],
    0
  );
  const summary = `
    <div class="detail-summary">
      <span class="detail-chip">${formatInteger.format(rows.length)} ${rows.length === 1 ? "registro" : "registros"}</span>
      <span class="detail-chip">${formatInteger.format(totalHuman)} danos humanos</span>
      <span class="detail-chip">${formatCurrency.format(totalLoss)} em prejuízos</span>
    </div>`;
  const legend = `
    <div class="detail-legend" aria-label="Legenda dos destaques dos registros">
      <span class="detail-legend-human">Prejuízos econômicos</span>
      <span><i class="detail-legend-swatch financial-low" aria-hidden="true"></i>Até R$ 100 mil</span>
      <span><i class="detail-legend-swatch financial-moderate" aria-hidden="true"></i>R$ 100 mil a R$ 1 milhão</span>
      <span><i class="detail-legend-swatch financial-high" aria-hidden="true"></i>R$ 1 milhão a R$ 10 milhões</span>
      <span><i class="detail-legend-swatch financial-very-high" aria-hidden="true"></i>Acima de R$ 10 milhões</span>
    </div>`;

  const cards = rows
    .map((row) => {
      const type = state.types[row[EVENT.type]];
      return `
        <article class="event-detail">
          <header class="event-detail-header">
            <div class="event-type">
              <i class="detail-dot" style="background:${type.color}" aria-hidden="true"></i>
              <span>${escapeHtml(type.name)}</span>
            </div>
            <div class="event-protocol">
              ${escapeHtml(row[EVENT.protocol])}<br>
              Evento: ${isoDateLabel(row[EVENT.eventDate])} · Registro: ${isoDateLabel(
                row[EVENT.registrationDate]
              )}
            </div>
          </header>
          <div class="event-grid">
            ${detailMetric("Danos humanos", row[EVENT.human], { typeColor: type.color })}
            ${detailMetric("Mortos", row[EVENT.deaths], { typeColor: type.color })}
            ${detailMetric("Feridos", row[EVENT.injured], { typeColor: type.color })}
            ${detailMetric("Enfermos", row[EVENT.sick], { typeColor: type.color })}
            ${detailMetric("Desabrigados", row[EVENT.homeless], { typeColor: type.color })}
            ${detailMetric("Desalojados", row[EVENT.displaced], { typeColor: type.color })}
            ${detailMetric("Desaparecidos", row[EVENT.missing], { typeColor: type.color })}
            ${detailMetric("Afetados por seca", row[EVENT.drought], { typeColor: type.color })}
            ${detailMetric("Outros afetados", row[EVENT.other], { typeColor: type.color })}
            ${detailMetric("Prejuízo público", row[EVENT.publicLoss], {
              formatter: formatCurrency,
              financial: true,
            })}
            ${detailMetric("Prejuízo privado", row[EVENT.privateLoss], {
              formatter: formatCurrency,
              financial: true,
            })}
          </div>
        </article>`;
    })
    .join("");
  dom.detailContent.innerHTML = summary + cards + legend;
}

function closeDetail() {
  if (dom.detailModal.classList.contains("is-hidden")) return;
  dom.detailModal.classList.add("is-hidden");
  state.detailSnapshot = null;
  syncViewUrl();
  removePlaybackBlock("detail");
  document.getElementById("map").focus({ preventScroll: true });
}

function canPlayback() {
  return state.ready && state.playbackWanted && state.playbackBlocks.size === 0;
}

function schedulePlayback(delay = state.playbackSpeed) {
  clearTimeout(state.playbackTimer);
  if (!canPlayback()) return;
  state.playbackTimer = window.setTimeout(() => {
    if (!canPlayback()) return;
    if (state.currentPeriod >= state.periods.length - 1) {
      state.playbackWanted = false;
      syncPlaybackUi();
      return;
    }
    setPeriod(state.currentPeriod + 1);
    schedulePlayback(state.playbackSpeed);
  }, delay);
}

function syncPlaybackUi() {
  clearTimeout(state.playbackTimer);
  if (state.playbackWanted) {
    dom.playIcon.textContent = "❚❚";
    dom.playLabel.textContent = "Pausar";
    dom.playButton.setAttribute("aria-label", "Pausar linha temporal");
  } else {
    dom.playIcon.textContent = "▶";
    dom.playLabel.textContent = "Reproduzir";
    dom.playButton.setAttribute("aria-label", "Reproduzir linha temporal");
  }

  let message = "";
  if (state.playbackWanted && state.playbackBlocks.has("hidden")) {
    message = "Reprodução pausada enquanto esta aba estiver oculta.";
  } else if (state.playbackWanted && state.playbackBlocks.has("map")) {
    message = "Linha temporal aguardando o fim do movimento do mapa.";
  } else if (state.playbackWanted && state.playbackBlocks.has("detail")) {
    message = "Reprodução pausada enquanto os detalhes estão abertos.";
  } else if (state.playbackWanted && state.playbackBlocks.has("scope")) {
    message = "Reprodução pausada durante a troca de recorte territorial.";
  }
  dom.playbackMessage.textContent = message;
  if (!state.playbackWanted && state.ready && state.temporalSeries.length) {
    renderTemporalTooltip(state.currentPeriod, true);
  }
  if (canPlayback()) schedulePlayback(state.playbackSpeed);
}

function togglePlayback() {
  if (!state.ready) return;
  state.playbackWanted = !state.playbackWanted;
  if (state.playbackWanted && state.currentPeriod >= state.periods.length - 1) setPeriod(0);
  syncPlaybackUi();
}

function addPlaybackBlock(reason) {
  state.playbackBlocks.add(reason);
  syncPlaybackUi();
}

function removePlaybackBlock(reason) {
  state.playbackBlocks.delete(reason);
  syncPlaybackUi();
}

function geometryFileUrl(uf) {
  return versionedDataUrl(state.manifest.files.stateGeometryPattern.replace("{UF}", uf));
}

function refreshMapLayout() {
  window.requestAnimationFrame(() => {
    map.invalidateSize({ animate: false });
    syncMapScaleOffset();
    drawTemporalChart();
    window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      syncMapScaleOffset();
    }, 140);
  });
}

function resetMapToScope() {
  if (!state.geoLayer) return;
  closeMapTooltip();
  closeMunicipalityPopupImmediately();
  map.fitBounds(state.geoLayer.getBounds(), {
    padding: [18, 18],
    animate: false,
  });
}

function mapIsFullscreen() {
  return document.fullscreenElement === dom.mapStage || state.pseudoFullscreen;
}

function syncFullscreenControl() {
  const active = mapIsFullscreen();
  const label = active ? "Sair da tela cheia" : "Visualizar mapa em tela cheia";
  dom.toggleFullscreen.setAttribute("aria-label", label);
  dom.toggleFullscreen.setAttribute("title", label);
  dom.toggleFullscreen.setAttribute("aria-pressed", String(active));
  dom.toggleFullscreen.classList.toggle("is-active", active);
}

function enterPseudoFullscreen() {
  state.pseudoFullscreen = true;
  document.body.classList.add("map-pseudo-fullscreen");
  dom.mapStage.classList.add("is-pseudo-fullscreen");
  syncFullscreenControl();
  refreshMapLayout();
}

function exitPseudoFullscreen() {
  if (!state.pseudoFullscreen) return;
  state.pseudoFullscreen = false;
  document.body.classList.remove("map-pseudo-fullscreen");
  dom.mapStage.classList.remove("is-pseudo-fullscreen");
  syncFullscreenControl();
  refreshMapLayout();
}

async function toggleMapFullscreen() {
  if (document.fullscreenElement === dom.mapStage) {
    await document.exitFullscreen();
    return;
  }
  if (state.pseudoFullscreen) {
    exitPseudoFullscreen();
    return;
  }
  if (typeof dom.mapStage.requestFullscreen === "function") {
    try {
      await dom.mapStage.requestFullscreen();
      return;
    } catch (error) {
      console.warn("Tela cheia nativa indisponível; usando modo ampliado.", error);
    }
  }
  enterPseudoFullscreen();
}

async function changeScope(nextUf) {
  if (!state.ready || nextUf === state.scopeUF) return;
  const previousUf = state.scopeUF;
  setUpdateStatusPanel(false);
  addPlaybackBlock("scope");
  dom.ufSelector.disabled = true;
  setStatus("loading", `Carregando ${UF_NAMES[nextUf]}`);

  try {
    let geometry = state.geometryCache.get(nextUf);
    if (!geometry) {
      geometry = await fetchJson(geometryFileUrl(nextUf));
      state.geometryCache.set(nextUf, geometry);
    }
    state.scopeUF = nextUf;
    if (nextUf !== "BR") state.temporalStateUF = nextUf;
    const locatedMeta = state.locatedMunicipalityCode
      ? state.municipalityByCode.get(state.locatedMunicipalityCode)
      : null;
    if (locatedMeta && nextUf !== "BR" && locatedMeta.uf !== nextUf) {
      setLocatedMunicipality(null);
      closeMunicipalityPopupImmediately();
      dom.municipalitySearchInput.value = "";
    }
    const temporalMeta = state.temporalMunicipalityCode
      ? state.municipalityByCode.get(state.temporalMunicipalityCode)
      : null;
    if (temporalMeta && nextUf !== "BR" && temporalMeta.uf !== nextUf) {
      setTemporalMunicipality(null);
    }
    if (state.temporalContext !== "municipality") {
      state.temporalContext = nextUf === "BR" ? "brazil" : "state";
    }
    renderGeography(geometry, true);
    dom.scopePill.textContent = UF_NAMES[nextUf];
    refreshTemporalSeries();
    setPeriod(state.currentPeriod);
    renderUpdateStatus();
  } catch (error) {
    console.error(error);
    dom.ufSelector.value = previousUf;
    setStatus("error", "Falha ao carregar a UF");
  } finally {
    dom.ufSelector.disabled = false;
    removePlaybackBlock("scope");
  }
}

function setAllTypes(checked) {
  applyTypeSelection(checked ? state.types.map((type) => type.id) : []);
  refreshTemporalSeries();
  setPeriod(state.currentPeriod);
}

function handleTypeChange(event) {
  const groupId = event.target.dataset.typeGroup;
  if (groupId) {
    const nextSelection = new Set(state.activeTypes);
    for (const typeId of typeIdsForGroup(groupId)) {
      if (event.target.checked) nextSelection.add(typeId);
      else nextSelection.delete(typeId);
    }
    applyTypeSelection(nextSelection);
    refreshTemporalSeries();
    setPeriod(state.currentPeriod);
    return;
  }

  state.activeTypes = new Set(
    [...dom.typeList.querySelectorAll("input[data-type-id]:checked")].map((input) =>
      Number(input.value)
    )
  );
  syncTypeGroupStates();
  refreshTemporalSeries();
  setPeriod(state.currentPeriod);
}

function bindEvents() {
  dom.retryButton.addEventListener("click", () => window.location.reload());
  dom.dataStatus.addEventListener("click", () => {
    setUpdateStatusPanel(dom.dataStatus.getAttribute("aria-expanded") !== "true");
  });
  dom.closeUpdateStatus.addEventListener("click", () => setUpdateStatusPanel(false, true));
  document.addEventListener("click", (event) => {
    if (
      dom.dataStatus.getAttribute("aria-expanded") === "true" &&
      !event.target.closest(".update-status-wrap")
    ) {
      setUpdateStatusPanel(false);
    }
    if (
      !dom.municipalitySearchPanel.hidden &&
      !event.target.closest("#municipalityLocator") &&
      !event.target.closest("#temporalMunicipality")
    ) {
      closeMunicipalitySearch();
    }
  });
  dom.ufSelector.addEventListener("change", (event) => changeScope(event.target.value));
  dom.typeList.addEventListener("change", handleTypeChange);
  dom.selectAllTypes.addEventListener("click", () => setAllTypes(true));
  dom.clearAllTypes.addEventListener("click", () => setAllTypes(false));
  dom.openExport.addEventListener("click", openExportDialog);
  dom.closeExport.addEventListener("click", closeExportDialog);
  dom.cancelExport.addEventListener("click", closeExportDialog);
  dom.confirmExport.addEventListener("click", generateExport);
  dom.exportModal.addEventListener("click", (event) => {
    if (event.target === dom.exportModal) closeExportDialog();
  });
  for (const input of document.querySelectorAll('input[name="exportPeriod"]')) {
    input.addEventListener("change", updateExportEstimate);
  }
  dom.previousPeriod.addEventListener("click", () => setPeriod(state.currentPeriod - 1));
  dom.nextPeriod.addEventListener("click", () => setPeriod(state.currentPeriod + 1));
  dom.shareView.addEventListener("click", shareCurrentView);
  dom.toggleTemporalAnalysis.addEventListener("click", () => {
    setTemporalAnalysisExpanded(!state.temporalExpanded);
  });
  dom.temporalAnalysis.addEventListener("click", (event) => {
    const contextButton = event.target.closest("[data-temporal-context]");
    if (contextButton) {
      setTemporalContext(contextButton.dataset.temporalContext);
      return;
    }
    const metricButton = event.target.closest("[data-temporal-metric]");
    if (metricButton) setTemporalMetric(metricButton.dataset.temporalMetric);
  });
  dom.temporalChart.addEventListener("pointermove", (event) => {
    state.temporalHoverIndex = temporalIndexFromPointer(event);
    previewTemporalIndex(state.temporalHoverIndex);
  });
  dom.temporalChart.addEventListener("pointerleave", () => {
    state.temporalHoverIndex = null;
    const guide = dom.temporalChart.querySelector("#temporalHoverGuide");
    if (guide) guide.hidden = true;
    renderTemporalTooltip(state.currentPeriod);
  });
  dom.temporalChart.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    dom.temporalChart.focus({ preventScroll: true });
    setPeriod(temporalIndexFromPointer(event));
  });
  dom.toggleFullscreen.addEventListener("click", toggleMapFullscreen);
  dom.resetMapView.addEventListener("click", resetMapToScope);
  dom.municipalitySearchToggle.addEventListener("click", () => {
    if (dom.municipalitySearchPanel.hidden) openMunicipalitySearch();
    else closeMunicipalitySearch(true);
  });
  dom.municipalitySearchInput.addEventListener("input", renderMunicipalitySearchResults);
  dom.municipalitySearchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      const firstResult = dom.municipalitySearchResults.querySelector("button");
      if (firstResult) {
        event.preventDefault();
        firstResult.focus();
      }
    }
  });
  dom.municipalitySearchClear.addEventListener("click", clearLocatedMunicipality);
  dom.municipalitySearchResults.addEventListener("click", (event) => {
    const result = event.target.closest("button[data-code]");
    if (result) locateMunicipality(result.dataset.code);
  });
  dom.municipalitySearchResults.addEventListener("keydown", (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const buttons = [...dom.municipalitySearchResults.querySelectorAll("button")];
    const currentIndex = buttons.indexOf(document.activeElement);
    if (currentIndex < 0) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (currentIndex + direction + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  });
  dom.playButton.addEventListener("click", togglePlayback);
  dom.speedSelect.addEventListener("change", () => {
    state.playbackSpeed = Number(dom.speedSelect.value);
    syncPlaybackUi();
  });
  dom.periodSlider.addEventListener("input", (event) => setPeriod(event.target.value));
  dom.resultsViewport.addEventListener("scroll", renderVirtualRows, { passive: true });
  dom.closeDetail.addEventListener("click", closeDetail);
  dom.detailModal.addEventListener("click", (event) => {
    if (event.target === dom.detailModal) closeDetail();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) addPlaybackBlock("hidden");
    else removePlaybackBlock("hidden");
  });

  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement === dom.mapStage && state.pseudoFullscreen) {
      exitPseudoFullscreen();
    }
    syncFullscreenControl();
    refreshMapLayout();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!dom.exportModal.classList.contains("is-hidden")) {
        closeExportDialog();
        return;
      }
      if (!dom.municipalitySearchPanel.hidden) {
        closeMunicipalitySearch(true);
        return;
      }
      if (dom.dataStatus.getAttribute("aria-expanded") === "true") {
        setUpdateStatusPanel(false, true);
        return;
      }
      if (!dom.detailModal.classList.contains("is-hidden")) {
        closeDetail();
        return;
      }
      if (state.pseudoFullscreen) {
        exitPseudoFullscreen();
        return;
      }
      return;
    }
    if (!state.ready || !dom.detailModal.classList.contains("is-hidden")) return;
    if (event.target.closest("input, select, button, #map")) return;
    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === "ArrowLeft") {
      setPeriod(state.currentPeriod - 1);
    } else if (event.key === "ArrowRight") {
      setPeriod(state.currentPeriod + 1);
    }
  });

  map.on("movestart zoomstart", () => {
    clearTimeout(state.mapResumeTimer);
    closeMapTooltip();
    addPlaybackBlock("map");
  });
  map.on("moveend zoomend", () => {
    clearTimeout(state.mapResumeTimer);
    state.mapResumeTimer = window.setTimeout(() => removePlaybackBlock("map"), 180);
  });
  map.on("popupclose", (event) => {
    if (event.popup === municipalityLocatorPopup) clearMunicipalityPopupTimers();
  });
  map.on("baselayerchange overlayadd overlayremove", () => {
    window.requestAnimationFrame(syncMapScaleOffset);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      syncMapScaleOffset();
      renderVirtualRows();
      drawTemporalChart();
    }, 120);
  });
}

async function initialize() {
  bindEvents();
  try {
    const [manifest, updateStatus] = await Promise.all([
      fetchJson("data/manifest.json", "no-cache"),
      loadUpdateStatus(),
    ]);
    state.dataVersion = String(manifest.generatedAt || "").trim();
    if (!state.dataVersion) throw new Error("Manifesto sem identificação de geração.");
    const [summary, geometry] = await Promise.all([
      fetchJson(versionedDataUrl(manifest.files.summary)),
      fetchJson(versionedDataUrl(manifest.files.nationalGeometry)),
    ]);
    validatePayloads(manifest, summary, geometry);
    indexData(manifest, summary, geometry);
    state.updateStatus = updateStatus;
    buildUfSelector();
    buildTypeFilters();
    const initialView = viewStateFromUrl();
    applyTypeSelection(initialView.types);
    state.restoringView = true;

    let initialGeometry = geometry;
    if (initialView.uf !== "BR") {
      initialGeometry = await fetchJson(geometryFileUrl(initialView.uf));
      state.geometryCache.set(initialView.uf, initialGeometry);
    }
    state.scopeUF = initialView.uf;
    state.locatedMunicipalityCode = initialView.locatedMunicipalityCode;
    state.temporalMunicipalityCode = initialView.temporalMunicipalityCode;
    state.temporalStateUF = initialView.temporalStateUF;
    state.temporalMetric = initialView.temporalMetric;
    state.temporalContext = initialView.temporalContext;
    state.currentPeriod = initialView.periodIndex;
    dom.ufSelector.value = initialView.uf;
    dom.scopePill.textContent = UF_NAMES[initialView.uf];
    renderGeography(initialGeometry, true);

    dom.periodSlider.max = String(state.periods.length - 1);
    dom.temporalChart.setAttribute("aria-valuemax", String(state.periods.length - 1));
    dom.minPeriod.textContent = numericPeriodLabel(state.periods[0]);
    dom.maxPeriod.textContent = numericPeriodLabel(state.periods.at(-1));
    state.ready = true;
    syncTemporalControls();
    setTemporalAnalysisExpanded(initialView.temporalExpanded, false);
    observeMapCreditsSize();
    refreshTemporalSeries();
    setPeriod(initialView.periodIndex);
    state.urlSyncReady = true;
    syncViewUrl();
    renderUpdateStatus();
    dom.dataStatus.disabled = false;

    if (initialView.locatedMunicipalityCode) {
      await locateMunicipality(initialView.locatedMunicipalityCode);
    }
    if (initialView.municipalityCode) {
      await openMunicipalityDetail(initialView.municipalityCode);
    }
    state.restoringView = false;

    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      drawTemporalChart();
      dom.loadingOverlay.classList.add("is-hidden");
    });
  } catch (error) {
    showFatalError(error);
  }
}

initialize();
