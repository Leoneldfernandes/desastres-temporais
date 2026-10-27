# Painel experimental do Artigo 03

O painel usa um recorte congelado da base analítica REV18 de Santa Catarina, 2017–2025: 128 municípios, 348.645 município-dias, 1.123 protocolos e 361 protocolos com dano humano positivo. O arquivo `analogos.json` guarda os municípios, os histogramas de chuva diária e os protocolos necessários para a exploração. Não é atualizado automaticamente pelo Atlas.

## O que cada seleção mostra

- **Registros:** dias municipais com ao menos um protocolo por 1.000 dias municipais comparáveis. A precipitação é o acumulado de 1 dia, lag 0.
- **Presença de dano:** porcentagem dos protocolos comparáveis com dano humano positivo. A precipitação é o acumulado de 6 dias, lag 0.
- **Magnitude:** mediana dos danos humanos declarados entre os protocolos com valor positivo. A precipitação é o acumulado de 3 dias, lag 0.

Quando o eixo horizontal mostra a **chuva**, o gráfico usa os oito perfis municipais mais próximos da faixa SoVI e do ICM escolhidos. As barras usam intervalos de chuva; o resumo numérico usa a chuva escolhida com tolerância mínima de ±10 mm ou cerca de 12% do valor. Quando o eixo mostra **SoVI**, compara as cinco faixas entre municípios com ICM até dois pontos acima ou abaixo do escolhido e com chuva na tolerância indicada. Quando o eixo mostra **ICM**, compara cinco faixas de pontuação apenas entre municípios da faixa SoVI escolhida e com chuva na tolerância indicada. A barra destacada corresponde ao valor selecionado. `n` é o número de município-dias em Registros e o número de protocolos nas análises de dano.

As faixas extremas e algumas combinações de chuva, SoVI e ICM têm poucos municípios ou protocolos. A interface sinaliza amostras pequenas; barras pouco preenchidas devem ser lidas com cautela. Os índices SoVI e ICM representam características municipais e não variam dia a dia neste recorte. O painel é uma **descrição retrospectiva**; as barras não são coeficientes dos modelos ajustados da REV18, previsões ou evidência causal. O modelo ajustado do artigo considera outros controles e interações e deve continuar sendo a referência para inferência.

## Fontes e atribuição

- Registros de desastres e danos humanos: [Atlas Digital de Desastres no Brasil (MIDR)](https://atlasdigital.mdr.gov.br/).
- Precipitação: [EPAGRI/CIRAM](https://ciram.epagri.sc.gov.br/dadosambientaispublicos/), com complementação de lacunas pelo [INMET/BDMEP](https://portal.inmet.gov.br/servicos/bdmep-dados-hist%C3%B3ricos), conforme tratamento da pesquisa.
- SoVI: dados fornecidos por Júlia Boelter Nickel e atribuídos ao [trabalho de conclusão de curso no Repositório da UFSC](https://repositorio.ufsc.br/handle/123456789/264180). As faixas acompanham essa fonte; a codificação de 1 a 5 para uso no R foi feita pelo autor desta pesquisa.
- Capacidade municipal (ICM): [Indicador de Capacidade Municipal, MIDR](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/icm).

O painel foi concebido para testar a interação visual antes de qualquer incorporação ao site principal. Não reutilizar seus números como resultados finais do Artigo 03 sem confrontá-los com as tabelas e o manuscrito REV18.
