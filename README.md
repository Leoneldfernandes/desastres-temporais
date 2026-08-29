# Desastres no tempo

<!-- atlas-release:start -->
Mapa espaço-temporal dos registros oficiais de desastres no Brasil, com cobertura nacional e todos os meses de janeiro de 1991 a dezembro de 2025.

## Cobertura e metodologia

A versão publicada usa a base consolidada v1.1 do Atlas Digital de Desastres no Brasil, de 06/08/2026. São **76.190 registros**, **420 meses contínuos**, **16 tipologias oficiais** e **5.573 municípios e unidades equivalentes** na malha cartográfica.
<!-- atlas-release:end -->

O total territorial reproduz integralmente a Malha Municipal 2025 do IBGE: 5.569 municípios, o Distrito Federal (Brasília), o Distrito Estadual de Fernando de Noronha e duas Áreas Estaduais Operacionais do Rio Grande do Sul (Lagoa dos Patos e Lagoa Mirim). Portanto, o rótulo público “municípios e unidades equivalentes” é uma forma resumida; as duas áreas operacionais não são municípios. Boa Esperança do Norte (MT), instalado em 2025, está entre os 5.569 municípios. Nenhuma dessas feições é removida da malha.

Cada linha da fonte representa um registro de desastre. O mês do mapa vem de `Data_Evento`; as somas são agrupadas por mês, código territorial e tipologia. A aplicação não inventa eventos para meses ou locais sem registro.

As decisões de tratamento, variáveis, validações, limitações e composição territorial estão descritas em [Metodologia](docs/metodologia.md).

## Decisão de arquitetura

O CSV bruto do Atlas **não deve ser publicado nem lido pelo navegador**. Ele é grande, exige conversão de codificação e contém muito mais colunas do que o mapa usa. Isso faria cada visita repetir um processamento caro.

O repositório publica arquivos derivados e compactos:

- `data/atlas-summary.json.gz`: resumo mensal usado pelo mapa, KPIs e tabela;
- `data/update-status.json`: contrato e estado inicial da verificação de novas versões do Atlas;
- `data/geo/municipios-br.geojson.gz`: malha simplificada das 5.573 feições territoriais, carregada na abertura;
- `data/geo/uf/*.json.gz`: malhas estaduais mais detalhadas, carregadas somente ao escolher uma UF;
- `data/events/*.json.gz`: registros completos separados por UF, carregados somente ao clicar em um município.

Na primeira abertura, o navegador transfere aproximadamente 3,3 MB de dados compactados. A descompactação acontece automaticamente no navegador. Os detalhes são baixados sob demanda e ficam no cache normal. Assim, o Brasil inteiro é viável no GitHub Pages sem servidor, banco de dados ou Google Drive.

O manifesto é revalidado a cada abertura. Sua data de geração (`generatedAt`) é acrescentada aos endereços dos arquivos derivados como versão de cache. Uma nova publicação força o navegador a buscar o conjunto novo, enquanto os acessos seguintes à mesma versão continuam aproveitando o cache.

Os arquivos da interface (`app.css` e `app.js`) também usam uma versão de cache baseada nos 12 primeiros caracteres de seu SHA-256. Um teste automatizado exige que o endereço versionado seja atualizado sempre que o conteúdo desses arquivos mudar. Assim, cada nova interface é baixada uma única vez e as visitas seguintes continuam aproveitando o cache normal do navegador.

## Verificação semanal do Atlas

Às segundas-feiras, às 8h no fuso `America/Sao_Paulo`, o GitHub consulta a [página oficial de downloads do Atlas](https://atlasdigital.mdr.gov.br/paginas/downloads.xhtml). A rotina lê somente o HTML da página, localiza o CSV consolidado e compara seu endereço e sua versão com a fonte registrada no manifesto. O arquivo completo não é baixado nessa etapa.

O resultado público é mantido em `data/update-status.json` na branch técnica `atlas-status`, separada da branch principal protegida. O site lê esse pequeno arquivo diretamente e pode atualizar somente o aviso. Quando uma nova base é encontrada, os dados do mapa permanecem inalterados até a validação e a aprovação de um pull request específico.

Se o domínio, o nome do arquivo ou o formato da página não corresponderem ao padrão auditável esperado, a rotina não presume uma versão: publica o estado de falha, preserva a data da última verificação bem-sucedida e encerra a execução com erro para produzir um relatório no GitHub Actions.

Quando uma nova versão é encontrada, outro job baixa o CSV temporariamente no servidor do GitHub, reconstrói os arquivos derivados e compara cada protocolo com a versão publicada. Nenhum registro existente pode desaparecer ou mudar de município, UF, tipologia ou data. Correções nos campos de danos humanos e prejuízos podem aumentar ou diminuir e são discriminadas no relatório.

Se toda a validação for aprovada, a automação cria uma branch exclusiva e abre um pull request. Execuções posteriores reconhecem o PR já aberto e não criam duplicatas. O CSV bruto é apagado junto com o ambiente temporário; somente os dados derivados, o manifesto e o relatório científico entram no PR. A incorporação permanece obrigatoriamente manual.

O fluxo completo é composto pelas seguintes etapas:

1. consultar a página oficial de downloads e identificar a versão consolidada mais recente;
2. publicar no site somente o estado da consulta e a data da última verificação;
3. validar domínio, caminho, nome, versão e data do CSV anunciado;
4. verificar se já existe branch ou pull request para a mesma versão;
5. baixar o CSV em ambiente temporário, limitar seu tamanho e calcular o SHA-256;
6. validar todas as linhas e reconstruir o resumo e os 27 arquivos estaduais;
7. conferir períodos, tipologias, UFs, contagens e as 5.573 feições territoriais;
8. comparar todos os protocolos com a versão publicada e interromper diante de remoção ou mudança de identidade;
9. registrar cada correção de danos ou prejuízos com protocolo, campo, valores anterior e novo e diferença;
10. gerar um relatório JSON para auditoria computacional e um relatório Markdown em texto legível;
11. abrir uma branch e um pull request próprios e executar novamente os testes obrigatórios;
12. aguardar a revisão e a incorporação manual, únicas ações que podem alterar os dados publicados.

Cada atualização aprovada mantém permanentemente os dois relatórios em `docs/releases/`. O texto do pull request apresenta a síntese e aponta o arquivo Markdown integral quando o detalhamento ultrapassa o limite adequado para a descrição do GitHub. Em caso de erro, nenhum dado do site é trocado e os relatórios da tentativa permanecem disponíveis como artefato do GitHub Actions por 30 dias.

## Funcionalidades

- 5.573 municípios e unidades equivalentes visíveis desde a abertura;
- indicador clicável no topo com versão, período, geração e estado da verificação do Atlas;
- série mensal contínua indicada no manifesto, inclusive os meses sem registros;
- mês do painel inferior e limites da barra temporal no formato `MM/AAAA`;
- filtro territorial Brasil/UF;
- 16 tipologias oficiais, cada uma com cor fixa;
- cor municipal definida pela tipologia com mais danos humanos no mês;
- desempate por quantidade de eventos e, depois, pela ordem estável das tipologias;
- borda dourada para municípios com múltiplas tipologias;
- velocidades entre 1 mês a cada 2 segundos e 3 meses por segundo;
- pausa automática ao ocultar a aba, mover o mapa ou abrir detalhes;
- tabela virtualizada: todos os resultados permanecem disponíveis sem criar milhares de elementos na tela;
- exportação do mês exibido ou da série histórica filtrada em XLSX, CSV, JSON e ZIP científico;
- mapas de satélite, claro, ruas e fundo branco.

## Exportar resultados

O painel **Baixar dados** usa o mesmo resumo mensal já carregado pelo mapa. O recorte acompanha o contexto territorial da série temporal — Brasil, estado ou município — e as tipologias marcadas. É possível exportar somente o mês em exibição ou toda a série de janeiro de 1991 a dezembro de 2025.

A unidade de cada linha é **mês × município ou unidade equivalente × tipologia**. Os arquivos incluem ocorrências, danos humanos detalhados e prejuízos econômicos em reais. O XLSX contém as abas `Dados`, `Filtros` e `Dicionário`; o ZIP científico contém CSV, metadados JSON, dicionário e instruções.

Toda a geração acontece localmente no navegador. XLSX e ZIP são processados em uma tarefa separada da interface e usam compactação nativa quando disponível, sem enviar o recorte a servidores ou carregar bibliotecas externas. O arquivo registra a versão, a fonte, o SHA-256, a geração da base, os filtros e o horário da exportação.

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
  --report build-report.json \
  --source-url "https://atlasdigital.mdr.gov.br/arquivos/AAAA/BD_Atlas_..._Consolidado.csv" \
  --version "vX.Y — DD/MM/AAAA"
MAPSHAPER_BIN=mapshaper scripts/build_geography.sh /caminho/BR_Municipios_2025.shp data/geo
python3 scripts/validate_build.py --data data --strict-current
```

O CSV bruto é usado apenas como entrada local e não é incorporado ao repositório. `source-url` e `version` são obrigatórios para impedir que uma base nova seja identificada silenciosamente como se fosse a anterior.

Para testar localmente:

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000`. A página não funciona corretamente ao abrir o HTML diretamente pelo explorador de arquivos porque os navegadores bloqueiam a leitura local dos arquivos JSON.

## Fontes

- Desastres: [Atlas Digital de Desastres no Brasil](https://atlasdigital.mdr.gov.br/) / MIDR. A versão, a data e o SHA-256 da fonte constam no manifesto e no relatório de cada atualização.
- Limites territoriais: [Malha Municipal 2025 do IBGE](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html).
- Biblioteca cartográfica: Leaflet 1.9.4, incluída localmente sob licença BSD-2-Clause.
- Imagens de satélite: Esri, Maxar, Earthstar Geographics e comunidade GIS.
