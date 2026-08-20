# Desastres no tempo

Mapa espaço-temporal dos registros oficiais de desastres no Brasil, com todos os municípios e todos os meses de janeiro de 1991 a dezembro de 2025.

## Decisão de arquitetura

O CSV bruto do Atlas **não deve ser publicado nem lido pelo navegador**. A versão atual tem cerca de 86 MB, exige conversão de codificação e contém muito mais colunas do que o mapa usa. Isso faria cada visita repetir um processamento caro.

O repositório publica arquivos derivados e compactos:

- `data/atlas-summary.json.gz`: resumo mensal usado pelo mapa, KPIs e tabela;
- `data/geo/municipios-br.geojson.gz`: malha simplificada dos 5.573 municípios, carregada na abertura;
- `data/geo/uf/*.json.gz`: malhas estaduais mais detalhadas, carregadas somente ao escolher uma UF;
- `data/events/*.json.gz`: registros completos separados por UF, carregados somente ao clicar em um município.

Na primeira abertura, o navegador transfere aproximadamente 3,3 MB de dados compactados. A descompactação acontece automaticamente no navegador. Os detalhes são baixados sob demanda e ficam no cache normal. Assim, o Brasil inteiro é viável no GitHub Pages sem servidor, banco de dados ou Google Drive.

## Funcionalidades

- 5.573 municípios visíveis desde a abertura;
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

## Atualizar a base sem editar código

O fluxo **Atualizar base oficial do Atlas** fica disponível na aba **Actions** do GitHub. Execute-o manualmente, confira o endereço e a versão sugeridos e clique em **Run workflow**. Ele baixa o CSV oficial, converte os dados, atualiza a malha municipal, valida as contagens e grava os arquivos derivados.

O CSV temporário não é incorporado ao repositório.

## Atualização local

Requisitos: Python 3 e `mapshaper` 0.6.113.

```bash
python3 scripts/build_data.py --atlas /caminho/BD_Atlas.csv --output data
MAPSHAPER_BIN=mapshaper scripts/build_geography.sh /caminho/BR_Municipios_2025.shp data/geo
python3 scripts/validate_build.py --data data
```

Para testar localmente:

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`. A página não funciona corretamente ao abrir o HTML diretamente pelo explorador de arquivos porque os navegadores bloqueiam a leitura local dos arquivos JSON.

## Fontes

- Desastres: Atlas Digital de Desastres no Brasil / MIDR, base consolidada v1.1 de 06/08/2026.
- Limites municipais: Malha Municipal 2025 do IBGE.
- Biblioteca cartográfica: Leaflet 1.9.4, incluída localmente sob licença BSD-2-Clause.
- Imagens de satélite: Esri, Maxar, Earthstar Geographics e comunidade GIS.
