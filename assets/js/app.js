/* global L */

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

const ROW_HEIGHT = 42;
const TABLE_HEADER_HEIGHT = 35;
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
    "loadingOverlay",
    "loadingTitle",
    "loadingMessage",
    "retryButton",
    "displayPeriod",
    "previousPeriod",
    "playButton",
    "playIcon",
    "playLabel",
    "nextPeriod",
    "speedSelect",
    "minPeriod",
    "maxPeriod",
    "periodSlider",
    "playbackMessage",
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

  state.geometryCache.set("BR", geometry);
  state.activeTypes = new Set(state.types.map((type) => type.id));
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
  dom.typeList.innerHTML = state.types
    .map(
      (type) => `
        <label class="type-item" title="${escapeHtml(type.name)}">
          <input type="checkbox" value="${type.id}" checked>
          <span class="type-swatch" style="background:${type.color}" aria-hidden="true"></span>
          <span>${escapeHtml(type.name)}</span>
          <span class="type-total">${formatCompact.format(type.events)}</span>
        </label>`
    )
    .join("");
}

function layerStyle(aggregate, hovered = false) {
  if (!aggregate) {
    if (!hovered) return EMPTY_STYLE;
    return {
      ...EMPTY_STYLE,
      color: "#42d6e8",
      weight: 2,
      opacity: 0.95,
    };
  }

  const type = state.types[aggregate.dominantType];
  const multiple = aggregate.typeCount > 1;
  const band = humanImpactBand(aggregate.human);
  return {
    color: hovered ? "#ffffff" : multiple ? "#ffd166" : "#d9edf4",
    weight: hovered ? 3.2 : 1.05 + band * 0.38,
    opacity: hovered ? 1 : multiple ? 0.98 : 0.84,
    fillColor: type.color,
    fillOpacity: hovered ? 0.92 : 0.79,
    dashArray: multiple && !hovered ? "5 3" : null,
  };
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
  const changed = new Set([...state.previousStyledCodes, ...aggregates.keys()]);
  for (const code of changed) {
    const layer = state.layerByCode.get(code);
    if (layer) layer.setStyle(layerStyle(aggregates.get(code)));
  }
  state.previousStyledCodes = new Set(aggregates.keys());

  if (state.hovered) {
    const layer = state.layerByCode.get(state.hovered.code);
    if (layer) layer.setStyle(layerStyle(aggregates.get(state.hovered.code), true));
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
  const { aggregates, tableRows } = calculatePeriod(bounded);
  state.currentAggregates = aggregates;

  updateMapStyles(aggregates);
  renderIndicators(aggregates);
  updateVirtualTable(tableRows);

  dom.periodSlider.value = String(bounded);
  dom.displayPeriod.textContent = label;
  dom.kpiPeriod.textContent = label;
  dom.resultsPeriod.textContent = label;

  if (state.hovered && municipalityTooltip._map) {
    municipalityTooltip.setContent(tooltipContent(state.hovered.code));
  }
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

function handleMunicipalityHover(event, code) {
  clearTimeout(state.hoverTimer);
  const previous = state.hovered?.code;
  if (previous && previous !== code) {
    const previousLayer = state.layerByCode.get(previous);
    if (previousLayer) previousLayer.setStyle(layerStyle(state.currentAggregates.get(previous)));
  }
  state.hovered = { code, latlng: event.latlng };
  event.target.setStyle(layerStyle(state.currentAggregates.get(code), true));
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
  if (layer) layer.setStyle(layerStyle(state.currentAggregates.get(code)));
  if (state.hovered?.code === code) state.hovered = null;
  closeMapTooltip();
}

function closeMapTooltip() {
  clearTimeout(state.hoverTimer);
  const hoveredCode = state.hovered?.code;
  if (hoveredCode) {
    const layer = state.layerByCode.get(hoveredCode);
    if (layer) layer.setStyle(layerStyle(state.currentAggregates.get(hoveredCode)));
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

function detailMetric(label, value, formatter = formatInteger) {
  return `<div class="event-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(
    formatter.format(value)
  )}</strong></div>`;
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
            ${detailMetric("Danos humanos", row[EVENT.human])}
            ${detailMetric("Mortos", row[EVENT.deaths])}
            ${detailMetric("Feridos", row[EVENT.injured])}
            ${detailMetric("Enfermos", row[EVENT.sick])}
            ${detailMetric("Desabrigados", row[EVENT.homeless])}
            ${detailMetric("Desalojados", row[EVENT.displaced])}
            ${detailMetric("Desaparecidos", row[EVENT.missing])}
            ${detailMetric("Afetados por seca", row[EVENT.drought])}
            ${detailMetric("Outros afetados", row[EVENT.other])}
            ${detailMetric("Prejuízo público", row[EVENT.publicLoss], formatCurrency)}
            ${detailMetric("Prejuízo privado", row[EVENT.privateLoss], formatCurrency)}
          </div>
        </article>`;
    })
    .join("");
  dom.detailContent.innerHTML = summary + cards;
}

function closeDetail() {
  if (dom.detailModal.classList.contains("is-hidden")) return;
  dom.detailModal.classList.add("is-hidden");
  state.detailSnapshot = null;
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
    renderGeography(geometry, true);
    dom.scopePill.textContent = UF_NAMES[nextUf];
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
  for (const input of dom.typeList.querySelectorAll('input[type="checkbox"]')) {
    input.checked = checked;
  }
  state.activeTypes = checked ? new Set(state.types.map((type) => type.id)) : new Set();
  setPeriod(state.currentPeriod);
}

function handleTypeChange() {
  state.activeTypes = new Set(
    [...dom.typeList.querySelectorAll('input[type="checkbox"]:checked')].map((input) =>
      Number(input.value)
    )
  );
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
  });
  dom.ufSelector.addEventListener("change", (event) => changeScope(event.target.value));
  dom.typeList.addEventListener("change", handleTypeChange);
  dom.selectAllTypes.addEventListener("click", () => setAllTypes(true));
  dom.clearAllTypes.addEventListener("click", () => setAllTypes(false));
  dom.previousPeriod.addEventListener("click", () => setPeriod(state.currentPeriod - 1));
  dom.nextPeriod.addEventListener("click", () => setPeriod(state.currentPeriod + 1));
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (dom.dataStatus.getAttribute("aria-expanded") === "true") {
        setUpdateStatusPanel(false, true);
      }
      closeDetail();
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

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      renderVirtualRows();
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
    renderGeography(geometry, true);

    dom.periodSlider.max = String(state.periods.length - 1);
    dom.minPeriod.textContent = periodLabel(state.periods[0], true);
    dom.maxPeriod.textContent = periodLabel(state.periods.at(-1), true);
    state.ready = true;
    setPeriod(0);
    renderUpdateStatus();
    dom.dataStatus.disabled = false;

    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
      dom.loadingOverlay.classList.add("is-hidden");
    });
  } catch (error) {
    showFatalError(error);
  }
}

initialize();
