"use strict";

(function exposeAtlasExport(root) {
  const encoder = new TextEncoder();
  const UTF8_FLAG = 0x0800;

  const DATA_COLUMNS = Object.freeze([
    ["periodo", "Período", "Mês do evento no formato AAAA-MM."],
    ["ano", "Ano", "Ano do evento."],
    ["mes", "Mês", "Mês do evento, de 1 a 12."],
    ["codigo_ibge", "Código IBGE", "Código da feição territorial na Malha Municipal 2025."],
    ["municipio", "Município ou unidade equivalente", "Nome da feição territorial."],
    ["uf", "UF", "Sigla da unidade federativa."],
    ["tipologia", "Tipologia", "Tipologia oficial do desastre."],
    ["ocorrencias", "Ocorrências", "Quantidade de registros de desastre."],
    ["danos_humanos_total", "Danos humanos totais", "Total de danos humanos informado na fonte."],
    ["mortos", "Mortos", "Pessoas mortas."],
    ["feridos", "Feridos", "Pessoas feridas."],
    ["enfermos", "Enfermos", "Pessoas enfermas."],
    ["desabrigados", "Desabrigados", "Pessoas desabrigadas."],
    ["desalojados", "Desalojados", "Pessoas desalojadas."],
    ["desaparecidos", "Desaparecidos", "Pessoas desaparecidas."],
    ["afetados_seca_estiagem", "Afetados por seca/estiagem", "Pessoas afetadas por seca ou estiagem."],
    ["outros_afetados", "Outros afetados", "Demais pessoas afetadas."],
    ["prejuizo_publico_reais", "Prejuízo público (R$)", "Prejuízo econômico público em reais."],
    ["prejuizo_privado_reais", "Prejuízo privado (R$)", "Prejuízo econômico privado em reais."],
    ["prejuizo_total_reais", "Prejuízo total (R$)", "Soma dos prejuízos público e privado em reais."],
  ]);

  function xmlEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  function csvCell(value) {
    if (value === null || value === undefined) return "";
    const text = String(value);
    if (!/[;"\r\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function csvText(rows, columns = DATA_COLUMNS.map(([key]) => key)) {
    const lines = [columns.map(csvCell).join(";")];
    for (const row of rows) {
      lines.push(columns.map((key) => csvCell(row[key])).join(";"));
    }
    return `\ufeff${lines.join("\r\n")}\r\n`;
  }

  function dictionaryRows() {
    return DATA_COLUMNS.map(([campo, nome, descricao]) => ({ campo, nome, descricao }));
  }

  function dictionaryCsv() {
    return csvText(dictionaryRows(), ["campo", "nome", "descricao"]);
  }

  function jsonText(rows, metadata) {
    return `${JSON.stringify({ metadados: metadata, dados: rows }, null, 2)}\n`;
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    };
  }

  function uint16(value) {
    const bytes = new Uint8Array(2);
    new DataView(bytes.buffer).setUint16(0, value, true);
    return bytes;
  }

  function uint32(value) {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
    return bytes;
  }

  function concatBytes(parts) {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      output.set(part, offset);
      offset += part.length;
    }
    return output;
  }

  function assembleZip(files, mimeType = "application/zip") {
    const localParts = [];
    const centralParts = [];
    const stamp = dosDateTime();
    let offset = 0;

    for (const file of files) {
      const name = encoder.encode(file.name);
      const source = file.source instanceof Uint8Array ? file.source : encoder.encode(String(file.source));
      const content = file.content instanceof Uint8Array ? file.content : source;
      const method = file.method || 0;
      const checksum = crc32(source);
      const local = concatBytes([
        uint32(0x04034b50), uint16(20), uint16(UTF8_FLAG), uint16(method),
        uint16(stamp.time), uint16(stamp.date), uint32(checksum), uint32(content.length),
        uint32(source.length), uint16(name.length), uint16(0), name, content,
      ]);
      const central = concatBytes([
        uint32(0x02014b50), uint16(20), uint16(20), uint16(UTF8_FLAG), uint16(method),
        uint16(stamp.time), uint16(stamp.date), uint32(checksum), uint32(content.length),
        uint32(source.length), uint16(name.length), uint16(0), uint16(0), uint16(0),
        uint16(0), uint32(0), uint32(offset), name,
      ]);
      localParts.push(local);
      centralParts.push(central);
      offset += local.length;
    }

    const central = concatBytes(centralParts);
    const end = concatBytes([
      uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length),
      uint32(central.length), uint32(offset), uint16(0),
    ]);
    return new Blob([...localParts, central, end], { type: mimeType });
  }

  function zipBlob(files, mimeType = "application/zip") {
    return assembleZip(
      files.map((file) => ({
        name: file.name,
        source: file.data instanceof Uint8Array ? file.data : encoder.encode(String(file.data)),
        method: 0,
      })),
      mimeType
    );
  }

  async function deflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function zipBlobCompressed(files, mimeType = "application/zip") {
    if (typeof CompressionStream !== "function") return zipBlob(files, mimeType);
    const prepared = [];
    try {
      for (const file of files) {
        const source = file.data instanceof Uint8Array ? file.data : encoder.encode(String(file.data));
        const compressed = await deflateRaw(source);
        prepared.push({
          name: file.name,
          source,
          content: compressed.length < source.length ? compressed : source,
          method: compressed.length < source.length ? 8 : 0,
        });
      }
    } catch (error) {
      console.warn("Compactação nativa indisponível; gerando pacote compatível sem compressão.", error);
      return zipBlob(files, mimeType);
    }
    return assembleZip(prepared, mimeType);
  }

  function columnName(index) {
    let value = index + 1;
    let name = "";
    while (value > 0) {
      value -= 1;
      name = String.fromCharCode(65 + (value % 26)) + name;
      value = Math.floor(value / 26);
    }
    return name;
  }

  function sheetCell(value, reference, header = false) {
    const style = header ? ' s="1"' : "";
    if (typeof value === "number" && Number.isFinite(value)) {
      return `<c r="${reference}"${style}><v>${value}</v></c>`;
    }
    return `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlEscape(
      value
    )}</t></is></c>`;
  }

  function worksheetXml(rows, columns) {
    const allRows = [columns.map((column) => column.label), ...rows.map((row) => columns.map((column) => row[column.key]))];
    const xmlRows = allRows.map((values, rowIndex) => {
      const number = rowIndex + 1;
      const cells = values.map((value, columnIndex) =>
        sheetCell(value, `${columnName(columnIndex)}${number}`, rowIndex === 0)
      );
      return `<row r="${number}">${cells.join("")}</row>`;
    });
    const lastCell = `${columnName(columns.length - 1)}${Math.max(1, allRows.length)}`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCell}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${xmlRows.join("")}</sheetData><autoFilter ref="A1:${columnName(columns.length - 1)}1"/></worksheet>`;
  }

  function objectRows(value) {
    return Object.entries(value).map(([campo, conteudo]) => ({
      campo,
      conteudo: Array.isArray(conteudo) ? conteudo.join(" | ") : String(conteudo ?? ""),
    }));
  }

  function xlsxFiles(rows, metadata) {
    const dataColumns = DATA_COLUMNS.map(([key, label]) => ({ key, label }));
    const filterRows = objectRows(metadata);
    const dictionary = dictionaryRows();
    const sheets = [
      { name: "Dados", rows, columns: dataColumns },
      { name: "Filtros", rows: filterRows, columns: [{ key: "campo", label: "Campo" }, { key: "conteudo", label: "Conteúdo" }] },
      { name: "Dicionário", rows: dictionary, columns: [{ key: "campo", label: "Campo" }, { key: "nome", label: "Nome" }, { key: "descricao", label: "Descrição" }] },
    ];
    const files = [
      { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
      { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
      { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF126E9D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
      { name: "docProps/core.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Dados filtrados — Desastres no tempo</dc:title><dc:creator>Leonel Delmiro Fernandes</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(metadata.gerado_em)}</dcterms:created></cp:coreProperties>` },
      { name: "docProps/app.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Desastres no tempo</Application></Properties>` },
    ];
    for (let index = 0; index < sheets.length; index += 1) {
      files.push({
        name: `xl/worksheets/sheet${index + 1}.xml`,
        data: worksheetXml(sheets[index].rows, sheets[index].columns),
      });
    }
    return files;
  }

  function xlsxBlob(rows, metadata) {
    return zipBlob(
      xlsxFiles(rows, metadata),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  function xlsxBlobCompressed(rows, metadata) {
    return zipBlobCompressed(
      xlsxFiles(rows, metadata),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  function scientificPackageFiles(rows, metadata) {
    const readme = [
      "DADOS FILTRADOS — DESASTRES NO TEMPO",
      "",
      `Gerado em: ${metadata.gerado_em}`,
      `Recorte territorial: ${metadata.recorte_territorial}`,
      `Período: ${metadata.periodo_exportado}`,
      `Tipologias: ${metadata.tipologias.join("; ")}`,
      `Linhas: ${metadata.quantidade_linhas}`,
      "",
      "CONTEÚDO",
      "- dados.csv: dados agregados por mês, território e tipologia.",
      "- metadados.json: fonte, versão e filtros aplicados.",
      "- dicionario_dados.csv: definição das colunas exportadas.",
      "",
      "Os dados oficiais não foram corrigidos ou reinterpretados durante a exportação.",
      "Valores econômicos estão expressos em reais.",
      "",
    ].join("\r\n");
    return [
      { name: "dados.csv", data: csvText(rows) },
      { name: "metadados.json", data: `${JSON.stringify(metadata, null, 2)}\n` },
      { name: "dicionario_dados.csv", data: dictionaryCsv() },
      { name: "LEIA-ME.txt", data: readme },
    ];
  }

  function scientificPackageBlob(rows, metadata) {
    return zipBlob(scientificPackageFiles(rows, metadata));
  }

  function scientificPackageBlobCompressed(rows, metadata) {
    return zipBlobCompressed(scientificPackageFiles(rows, metadata));
  }

  root.AtlasExport = Object.freeze({
    DATA_COLUMNS,
    csvText,
    dictionaryCsv,
    jsonText,
    zipBlob,
    xlsxBlob,
    xlsxBlobCompressed,
    scientificPackageBlob,
    scientificPackageBlobCompressed,
  });
})(typeof window === "undefined" ? globalThis : window);
