# Metodologia

## 1. Objeto e escopo

O projeto visualiza **registros oficiais de desastres**, e não todos os fenômenos físicos que possam ter ocorrido no território brasileiro. A fonte é o Atlas Digital de Desastres no Brasil, mantido pela Secretaria Nacional de Proteção e Defesa Civil do Ministério da Integração e do Desenvolvimento Regional (Sedec/MIDR).

<!-- atlas-methodology-release:start -->
Esta documentação descreve a versão atualmente publicada:

| Item | Cobertura |
| --- | ---: |
| Versão da fonte | v1.1 — 06/08/2026 |
| Período | janeiro de 1991 a dezembro de 2025 |
| Meses na sequência temporal | 420 |
| Registros de desastre | 76.190 |
| Protocolos S2iD únicos | 76.190 |
| Tipologias | 16 |
| Códigos territoriais com registros | 5.256 |
| Feições na malha | 5.573 |
| Linhas do resumo derivado | 73.744 |

O CSV bruto não é publicado no repositório. O site usa somente artefatos derivados e compactados, produzidos pelo processo descrito abaixo.

## 2. Fontes e proveniência

### 2.1. Registros de desastres

- Fonte institucional: [Atlas Digital de Desastres no Brasil](https://atlasdigital.mdr.gov.br/), Sedec/MIDR.
- Arquivo processado: `BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv`.
- Endereço registrado no processamento: <https://atlasdigital.mdr.gov.br/arquivos/2026/BD_Atlas_1991_2025_v1.1_2026.08.06_Consolidado.csv>.
- Codificação e separador esperados: ISO-8859-1 e ponto e vírgula.
<!-- atlas-methodology-release:end -->

Segundo o MIDR, os dados do Atlas são originados no Sistema Integrado de Informações sobre Desastres (S2iD) e passam por verificação e padronização institucional antes da publicação. O processamento deste repositório acrescenta validações técnicas, mas não substitui nem refaz a metodologia institucional do Atlas.

O processo calcula o SHA-256 do CSV recebido. Esse identificador é escrito no relatório de construção e, nas próximas reconstruções feitas com o código atual, também em `data/manifest.json`. Assim, dois processamentos podem confirmar se usaram exatamente os mesmos bytes de entrada.

### 2.2. Limites territoriais

- Fonte: [Malha Municipal Digital 2025](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html), IBGE.
- Arquivo de entrada esperado: `BR_Municipios_2025.shp`.
- Sistema de referência informado pelo IBGE: SIRGAS 2000, coordenadas geográficas.
- Chaves preservadas: código territorial (`CD_MUN`), nome (`NM_MUN`) e UF (`SIGLA_UF`).

A malha nacional é simplificada com retenção de 2% pelo algoritmo `weighted` do mapshaper, com preservação de feições pequenas (`keep-shapes`) e precisão de 0,001 grau. As malhas por UF retêm 10% e usam precisão de 0,0001 grau. A simplificação reduz o tamanho dos arquivos e, por isso, os polígonos do site não devem ser usados para medições cadastrais ou de área.

## 3. Unidade de observação e tempo

Cada linha aceita do CSV é tratada como um registro de desastre e deve possuir um protocolo S2iD único. O projeto preserva, para cada registro:

- mês de referência;
- código territorial;
- tipologia;
- protocolo S2iD;
- data do evento;
- data de registro;
- danos humanos;
- prejuízos públicos e privados.

O **mês de referência** é extraído de `Data_Evento`, interpretada como a data de início do evento. `Data_Registro` é preservada nos detalhes, mas não determina a posição do evento na linha do tempo.

Todos os meses entre o primeiro e o último período informado no manifesto são mantidos em sequência, inclusive quando um mês não possui registros. A ausência de uma linha agregada significa “nenhum registro oficial encontrado para essa combinação”, não a comprovação de que nenhum fenômeno ocorreu.

## 4. Cobertura territorial: por que existem 5.573 feições

O site usa o rótulo público aprovado **“5.573 municípios e unidades equivalentes”**. Para uso científico, sua composição precisa ser explicitada:

| Categoria da Malha Municipal 2025 | Quantidade |
| --- | ---: |
| Municípios, incluindo Boa Esperança do Norte (MT) | 5.569 |
| Distrito Federal — Brasília (`5300108`) | 1 |
| Distrito Estadual de Fernando de Noronha (`2605459`) | 1 |
| Áreas Estaduais Operacionais — Lagoa Mirim (`4300001`) e Lagoa dos Patos (`4300002`) | 2 |
| **Total de feições/geocódigos** | **5.573** |

As duas áreas operacionais lacustres não são municípios. Elas são mantidas porque integram a Malha Municipal Digital 2025 distribuída pelo IBGE; sua presença não cria nem imputa desastres. Brasília e Fernando de Noronha também não são municípios juridicamente, mas funcionam como unidades equivalentes em produtos estatísticos e possuem registros na fonte.

Em relação ao total de 5.570 que serviu como referência inicial neste projeto — 5.568 municípios, Distrito Federal e Fernando de Noronha — a diferença de três geocódigos é composta por:

1. Boa Esperança do Norte, novo município de Mato Grosso;
2. Área Operacional Lagoa Mirim;
3. Área Operacional Lagoa dos Patos.

O vínculo entre registros e geometria é feito pelo código de sete algarismos. A validação exige que todo código presente no resumo exista na malha, que os códigos da malha não se repitam e que o prefixo do código de cada registro corresponda à UF informada.

## 5. Tipologias

O projeto aceita exatamente as 16 tipologias presentes na versão publicada:

1. Alagamentos;
2. Chuvas Intensas;
3. Doenças infecciosas;
4. Enxurradas;
5. Erosão;
6. Estiagem e Seca;
7. Granizo;
8. Incêndio Florestal;
9. Inundações;
10. Movimento de Massa;
11. Onda de Calor e Baixa Umidade;
12. Onda de Frio;
13. Outros;
14. Rompimento/Colapso de barragens;
15. Tornado;
16. Vendavais e Ciclones.

Uma tipologia desconhecida ou a ausência completa de uma das 16 categorias interrompe a construção. O projeto não reclassifica os registros.

## 6. Variáveis e agregação

O resumo usado no mapa possui uma linha para cada combinação observada de **mês × código territorial × tipologia**.

| Campo derivado | Origem ou cálculo |
| --- | --- |
| `events` | contagem de linhas/registros na combinação |
| `humanTotal` | soma de `DH_total_danos_humanos_diretos` |
| `deaths` | soma de `DH_MORTOS` |
| `injured` | soma de `DH_FERIDOS` |
| `sick` | soma de `DH_ENFERMOS` |
| `homeless` | soma de `DH_DESABRIGADOS` |
| `displaced` | soma de `DH_DESALOJADOS` |
| `missing` | soma de `DH_DESAPARECIDOS` |
| `droughtAffected` | soma de `DH_AFETADOS_SECA_ESTIAGEM` |
| `otherAffected` | soma de `DH_OUTROS AFETADOS` |
| `publicLoss` | soma de `PEPL_total_publico` |
| `privateLoss` | soma de `PEPR_total_privado` |

`humanTotal` vem diretamente do total informado na fonte; ele não é recalculado pela soma das categorias detalhadas. Os valores monetários são reproduzidos como fornecidos pelo Atlas, com duas casas decimais no processamento. O projeto não aplica correção monetária adicional.

Células numéricas vazias são convertidas em zero, e a quantidade de vazios por campo é registrada no relatório de construção. Textos não numéricos, valores negativos, números infinitos e contagens fracionárias de pessoas são erros: não são silenciosamente convertidos em zero.

## 7. Tratamento das datas

O formato esperado é `DD/MM/AAAA`. Quando uma data não pode ser lida, o processo tenta recuperá-la a partir dos oito algarismos finais do protocolo S2iD. Esse uso alternativo gera um aviso no relatório. Se a recuperação for impossível, a construção falha.

Quando `Data_Registro` está vazia, usa-se `Data_Evento`, e a substituição é contabilizada no relatório. Datas de registro anteriores às datas dos eventos são mantidas para preservar o conteúdo oficial e geram aviso. Na versão publicada, existem **12 registros** nessa situação.

## 8. Validação e política de publicação

Antes da troca dos arquivos publicados, `scripts/build_data.py` verifica:

- presença de todas as colunas obrigatórias;
- protocolo presente e não duplicado;
- UF válida;
- código territorial com sete algarismos e prefixo compatível com a UF;
- consistência de UF para cada código e auditoria das variantes textuais de nome;
- tipologia pertencente à lista oficial;
- datas válidas ou recuperáveis;
- danos humanos inteiros e não negativos;
- prejuízos numéricos, finitos e não negativos.

O código IBGE é a identidade territorial usada nas junções. Quando a fonte apresenta grafias diferentes do nome para o mesmo código e a mesma UF, o registro é preservado, a variação gera aviso e o nome exibido continua vindo da malha oficial do IBGE. Divergências de UF, código ou demais campos obrigatórios permanecem como erro.

Qualquer erro impede a publicação. Os artefatos novos são preparados em diretório temporário e só substituem os anteriores depois da validação completa; se a troca falhar, os arquivos anteriores são restaurados. Avisos preservam o dado e tornam a exceção auditável.

O relatório JSON informa estado da execução, SHA-256 da fonte, linhas lidas e aceitas, erros, avisos, células numéricas vazias, datas recuperadas e até 200 ocorrências detalhadas.

Depois da construção, `scripts/validate_build.py` confere a integridade cruzada dos artefatos: sequência mensal, correspondência entre o período e o nome do CSV oficial, formato das linhas, índices de mês e tipologia, unicidade das 5.573 feições, presença de todos os códigos com eventos na geometria, 27 arquivos de eventos e 27 malhas estaduais, contagens por UF e data de geração válida. O argumento histórico `--strict-current` é mantido por compatibilidade, mas as invariantes científicas são sempre aplicadas.

Para uma atualização, `scripts/prepare_atlas_update.py` também compara os protocolos da versão candidata com os já publicados. A preparação é interrompida se um protocolo desaparecer ou mudar de município, UF, tipologia, data do evento ou data de registro. Alterações para mais ou para menos nos campos de danos humanos e prejuízos são permitidas, porque podem representar correções oficiais. Cada campo corrigido fica associado ao protocolo, UF, código territorial, tipologia e data do evento, com valor publicado, valor candidato e diferença. A relação completa é preservada sem corte no relatório permanente; a descrição do pull request pode apresentar somente uma síntese para respeitar seu limite de tamanho.

### 8.1. Etapas da atualização automática

1. O GitHub consulta a página oficial de downloads na segunda-feira às 8h, no fuso `America/Sao_Paulo`.
2. O endereço encontrado é aceito somente quando usa HTTPS, pertence exatamente ao domínio oficial e apresenta pasta, período, versão e data no padrão auditável.
3. O estado da consulta é gravado na branch técnica `atlas-status`. Essa etapa pode alterar o aviso do site, mas não os dados do mapa.
4. Quando existe uma versão posterior, o processo verifica se já há branch ou pull request aberto para ela. A repetição é interrompida para evitar duplicatas.
5. O CSV é baixado em diretório temporário, com limite de 500 MB, conferência de redirecionamento e cálculo do SHA-256. O arquivo bruto não é publicado nem incluído nos artefatos.
6. A fonte é lida linha por linha. Colunas, protocolos, UFs, códigos, tipologias, datas, danos humanos e prejuízos passam pelas regras descritas nesta metodologia.
7. Os arquivos derivados são construídos fora do diretório publicado. Em seguida, são conferidos a série mensal, as 16 tipologias, as 27 UFs, as 5.573 feições, os índices e todas as contagens internas.
8. Cada protocolo candidato é comparado ao correspondente publicado. Remoções e mudanças de identidade interrompem a atualização; inclusões e correções quantitativas permitidas são registradas.
9. O processo gera um relatório JSON completo e um relatório Markdown legível. Para cada correção quantitativa, ambos registram protocolo, território, tipologia, campo, valor anterior, valor novo e diferença. Também registram fonte, SHA-256, avisos, inclusões e variações agregadas.
10. Somente após aprovação de todas as verificações os arquivos derivados e os relatórios são empacotados. O job que realiza a leitura não possui permissão de escrita no repositório.
11. Um job final, isolado e com permissão restrita, cria uma branch determinística, envia os arquivos aprovados e abre o pull request. Ele não contém comando para aprovar ou incorporar.
12. A validação contínua é iniciada explicitamente na nova branch. Ela regenera os relatórios permanente e textual e falha se estiverem ausentes ou diferentes do resultado calculado. A proteção da `main` exige os testes, e a publicação depende da revisão e da incorporação manual do pull request.

Se qualquer etapa falhar, a branch `main` e os dados públicos permanecem inalterados. Os relatórios disponíveis até o ponto da falha são mantidos por 30 dias no GitHub Actions. Uma nova execução semanal pode tentar novamente, desde que não exista branch ou pull request conflitante.

A mesma verificação é executada automaticamente em todo pull request destinado à branch `main` e em todo envio à própria `main`. O check obrigatório chama-se **Testes e integridade dos dados**.

## 9. Artefatos derivados

| Arquivo | Conteúdo |
| --- | --- |
| `data/manifest.json` | versão, fonte, períodos, tipologias, colunas, caminhos e estatísticas |
| `data/atlas-summary.json.gz` | agregação por mês, código territorial e tipologia |
| `data/events/<UF>.json.gz` | registros individuais separados por UF |
| `data/geo/municipios-br.geojson.gz` | malha nacional simplificada |
| `data/geo/uf/<UF>.json.gz` | malhas estaduais com maior detalhe |
| `docs/releases/atlas-<versão>.json` | relatório permanente completo para auditoria computacional |
| `docs/releases/atlas-<versão>.md` | relatório permanente integral em texto legível |

Os JSON compactados usam ordem estável e gzip com data interna fixada em zero, o que favorece a reprodução de arquivos idênticos a partir das mesmas entradas e do mesmo código.

## 10. Reprodutibilidade

Requisitos: Python 3 e mapshaper 0.6.113.

```bash
python3 scripts/build_data.py \
  --atlas /caminho/BD_Atlas.csv \
  --output data \
  --report build-report.json \
  --source-url URL_DA_FONTE \
  --version "IDENTIFICAÇÃO_DA_VERSÃO"

MAPSHAPER_BIN=mapshaper \
  scripts/build_geography.sh /caminho/BR_Municipios_2025.shp data/geo

python3 scripts/validate_build.py --data data
python3 -m unittest discover -s tests -v
```

Cada versão aprovada gera dois relatórios em `docs/releases/`: JSON estruturado e Markdown em texto legível. Ambos contêm fonte, SHA-256, protocolos acrescentados, correções detalhadas por protocolo, diferenças por UF e tipologia e variações nos totais de danos e prejuízos.

Para citar um resultado reproduzido, recomenda-se registrar conjuntamente: versão e data do Atlas, SHA-256 do CSV, ano da malha do IBGE, commit do repositório e data de acesso.

## 11. Limitações de uso

- O mapa mede registros administrativos presentes no Atlas, não incidência física completa, risco, exposição, vulnerabilidade ou causalidade.
- A cobertura depende do registro no S2iD e dos procedimentos de consolidação da fonte. Comparações temporais podem refletir mudanças de registro e classificação, além de mudanças reais nos desastres.
- “Sem registro” não deve ser interpretado automaticamente como “sem desastre”.
- Células numéricas vazias são tratadas como zero para o cálculo; o relatório de construção é necessário para auditar a extensão dessa decisão.
- A malha de 2025 representa os eventos de todo o período. Ela não reconstrói limites municipais históricos, e a simplificação cartográfica impede uso cadastral.
- O mês é determinado pelo início informado do evento. Atrasos ou anomalias de registro não deslocam o evento para outro mês.
- Os prejuízos seguem os valores fornecidos pela fonte; este projeto não realiza correção monetária adicional nem altera o tratamento econômico adotado pelo Atlas.
- Registros associados à mesma tipologia e ao mesmo município podem representar eventos distintos; o protocolo S2iD é a chave usada para distinguir cada ocorrência.

## 12. Referências oficiais

- BRASIL. Ministério da Integração e do Desenvolvimento Regional. [Atlas Digital de Desastres no Brasil](https://atlasdigital.mdr.gov.br/). A edição efetivamente utilizada consta no manifesto e no relatório de atualização.
- BRASIL. Ministério da Integração e do Desenvolvimento Regional. [MIDR atualiza Atlas Digital de Desastres com dados consolidados até 2025](https://www.gov.br/mdr/pt-br/noticias/midr-atualiza-atlas-digital-de-desastres-com-dados-consolidados-ate-2025). 26 maio 2026.
- IBGE — Instituto Brasileiro de Geografia e Estatística. [Malha Municipal Digital 2025](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html). Acesso em 26 ago. 2026.
