# Desastres no tempo

Mapa espaço-temporal dos registros oficiais de desastres no Brasil, com cobertura nacional e todos os meses de janeiro de 1991 a dezembro de 2025.

## Cobertura e metodologia

A versão publicada usa a base consolidada v1.1 do Atlas Digital de Desastres no Brasil, de 06/08/2026. São **76.190 registros**, **420 meses contínuos**, **16 tipologias oficiais** e **5.573 municípios e unidades equivalentes** na malha cartográfica.

O total territorial reproduz integralmente a Malha Municipal 2025 do IBGE: 5.569 municípios, o Distrito Federal (Brasília), o Distrito Estadual de Fernando de Noronha e duas Áreas Estaduais Operacionais do Rio Grande do Sul (Lagoa dos Patos e Lagoa Mirim). Portanto, o rótulo público “municípios e unidades equivalentes” é uma forma resumida; as duas áreas operacionais não são municípios. Boa Esperança do Norte (MT), instalado em 2025, está entre os 5.569 municípios. Nenhuma dessas feições é removida da malha.

Cada linha da fonte representa um registro de desastre. O mês do mapa vem de `Data_Evento`; as somas são agrupadas por mês, código territorial e tipologia. A aplicação não inventa eventos para meses ou locais sem registro.

As decisões de tratamento, variáveis, validações, limitações e composição territorial estão descritas em [Metodologia](docs/metodologia.md).

## Decisão de arquitetura

O CSV bruto do Atlas **não deve ser publicado nem lido pelo navegador**. A versão atual tem cerca de 86 MB, exige conversão de codificação e contém muito mais colunas do que o mapa usa. Isso faria cada visita repetir um processamento caro.

O repositório publica arquivos derivados e compactos:

- `data/atlas-summary.json.gz`: resumo mensal usado pelo mapa, KPIs e tabela;
- `data/update-status.json`: estado da verificação de novas versões do Atlas;
- `data/geo/municipios-br.geojson.gz`: malha simplificada das 5.573 feições territoriais, carregada na abertura;
- `data/geo/uf/*.json.gz`: malhas estaduais mais detalhadas, carregadas somente ao escolher uma UF;
- `data/events/*.json.gz`: registros completos separados por UF, carregados somente ao clicar em um município.

Na primeira abertura, o navegador transfere aproximadamente 3,3 MB de dados compactados. A descompactação acontece automaticamente no navegador. Os detalhes são baixados sob demanda e ficam no cache normal. Assim, o Brasil inteiro é viável no GitHub Pages sem servidor, banco de dados ou Google Drive.

O manifesto é revalidado a cada abertura. Sua data de geração (`generatedAt`) é acrescentada aos endereços dos arquivos derivados como versão de cache. Uma nova publicação força o navegador a buscar o conjunto novo, enquanto os acessos seguintes à mesma versão continuam aproveitando o cache.

## Funcionalidades

- 5.573 municípios e unidades equivalentes visíveis desde a abertura;
- indicador clicável no topo com versão, período, geração e estado da verificação do Atlas;
- 420 meses contínuos, inclusive os meses sem registros;
- filtro territorial Brasil/UF;
- 16 tipologias oficiais, cada uma com cor fixa;
- cor municipal definida pela tipologia com mais danos humanos no mês;
- desempate por quantidade de eventos e, depois, pela ordem estável das tipologias;
- borda dourada para municípios com múltiplas tipologias;
- velocidades entre 1 mês a cada 2 segundos e 3 meses por segundo;
- pausa automática ao ocultar a aba, mover o mapa ou abrir detalhes;
- tabela virtualizada: todos os resultados permanecem disponíveis sem criar milhares de elementos na tela;
- mapas de satélite, claro, ruas e fundo branco.

## Publicar no GitHub Pages

1. Envie todo o conteúdo deste diretório para a raiz da branch `main`.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Escolha a branch `main`, a pasta `/ (root)` e salve.

Não envie apenas o `index.html`: as pastas `assets` e `data` fazem parte do site.

## Atualizar a base

Requisitos: Python 3 e `mapshaper` 0.6.113.

```bash
python3 scripts/build_data.py \
  --atlas /caminho/BD_Atlas.csv \
  --output data \
  --report build-report.json
MAPSHAPER_BIN=mapshaper scripts/build_geography.sh /caminho/BR_Municipios_2025.shp data/geo
python3 scripts/validate_build.py --data data --strict-current
```

O CSV bruto é usado apenas como entrada local e não é incorporado ao repositório. A publicação automática de uma nova versão será acrescentada em uma etapa própria; atualmente, somente a validação contínua está ativa no GitHub Actions.

Para testar localmente:

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`. A página não funciona corretamente ao abrir o HTML diretamente pelo explorador de arquivos porque os navegadores bloqueiam a leitura local dos arquivos JSON.

## Fontes

- Desastres: [Atlas Digital de Desastres no Brasil](https://atlasdigital.mdr.gov.br/) / MIDR, base consolidada v1.1 de 06/08/2026.
- Limites territoriais: [Malha Municipal 2025 do IBGE](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html).
- Biblioteca cartográfica: Leaflet 1.9.4, incluída localmente sob licença BSD-2-Clause.
- Imagens de satélite: Esri, Maxar, Earthstar Geographics e comunidade GIS.
