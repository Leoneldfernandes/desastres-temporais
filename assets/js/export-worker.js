"use strict";

let exporterLoaded = false;

self.addEventListener("message", async (event) => {
  const { exporterUrl, format, rows, metadata } = event.data;
  try {
    if (!exporterLoaded) {
      importScripts(exporterUrl);
      exporterLoaded = true;
    }
    self.postMessage({
      type: "progress",
      message: `Organizando ${rows.length.toLocaleString("pt-BR")} linhas…`,
    });
    let blob;
    if (format === "csv") {
      blob = new Blob([self.AtlasExport.csvText(rows)], { type: "text/csv;charset=utf-8" });
    } else if (format === "json") {
      blob = new Blob([self.AtlasExport.jsonText(rows, metadata)], { type: "application/json" });
    } else if (format === "zip") {
      blob = await self.AtlasExport.scientificPackageBlobCompressed(rows, metadata);
    } else {
      blob = await self.AtlasExport.xlsxBlobCompressed(rows, metadata);
    }
    self.postMessage({ type: "complete", blob });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
