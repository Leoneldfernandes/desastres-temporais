#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Uso: $0 <BR_Municipios_2025.shp> <diretorio-de-saida>" >&2
  exit 2
fi

SHAPEFILE=$1
OUTPUT_DIR=$2
MAPSHAPER_BIN=${MAPSHAPER_BIN:-mapshaper}

if [[ ! -f "$SHAPEFILE" ]]; then
  echo "Shapefile não encontrado: $SHAPEFILE" >&2
  exit 2
fi

if ! command -v "$MAPSHAPER_BIN" >/dev/null 2>&1; then
  echo "mapshaper não encontrado. Instale com: npm install -g mapshaper@0.6.113" >&2
  exit 2
fi

mkdir -p "$OUTPUT_DIR/uf"
find "$OUTPUT_DIR/uf" -maxdepth 1 -type f \( -name '*.json' -o -name '*.json.gz' \) -delete
rm -f "$OUTPUT_DIR/municipios-br.geojson" "$OUTPUT_DIR/municipios-br.geojson.gz"

# A malha nacional é propositalmente mais simplificada: precisa desenhar os
# 5.573 polígonos já na abertura. keep-shapes impede o desaparecimento de
# municípios pequenos.
"$MAPSHAPER_BIN" "$SHAPEFILE" \
  -filter-fields CD_MUN,NM_MUN,SIGLA_UF \
  -rename-fields cd=CD_MUN,nm=NM_MUN,uf=SIGLA_UF \
  -simplify weighted 2% keep-shapes \
  -o "$OUTPUT_DIR/municipios-br.geojson" format=geojson precision=0.001
gzip -6 -n "$OUTPUT_DIR/municipios-br.geojson"

# Ao filtrar uma UF, o navegador troca para uma malha mais detalhada. Os
# arquivos separados são baixados somente quando o estado é selecionado.
"$MAPSHAPER_BIN" "$SHAPEFILE" \
  -filter-fields CD_MUN,NM_MUN,SIGLA_UF \
  -rename-fields cd=CD_MUN,nm=NM_MUN,uf=SIGLA_UF \
  -simplify weighted 10% keep-shapes \
  -split uf \
  -o "$OUTPUT_DIR/uf" format=geojson precision=0.0001

for state_file in "$OUTPUT_DIR"/uf/*.json; do
  gzip -6 -n "$state_file"
done

echo "Malhas geradas em $OUTPUT_DIR"
