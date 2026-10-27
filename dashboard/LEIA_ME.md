# Painel experimental do Artigo 03

O painel usa um recorte congelado da base analítica REV18 de Santa Catarina, 2017–2025: 128 municípios, 348.645 município-dias, 1.123 protocolos e 361 protocolos com dano humano positivo. O arquivo `analogos.json` guarda os municípios, os histogramas de chuva diária e os protocolos necessários para a exploração. Não é atualizado automaticamente pelo Atlas.

## O que cada seleção mostra

- **Registros:** dias municipais com ao menos um protocolo por 1.000 dias municipais comparáveis. A precipitação é o acumulado de 1 dia, lag 0.
- **Presença de dano:** porcentagem dos protocolos comparáveis com dano humano positivo. A precipitação é o acumulado de 6 dias, lag 0.
- **Magnitude:** mediana dos danos humanos declarados entre os protocolos com valor positivo. A precipitação é o acumulado de 3 dias, lag 0.

O controle **SoVI** usa o escore numérico (de −3,5 a 1,9, em passos de 0,1). A etiqueta colorida apenas traduz esse escore nas classes da fonte: muito baixa (< −1,5), baixa (−1,5 a < −0,5), média (−0,5 a < 0,5), alta (0,5 a < 1,5) e muito alta (≥ 1,5). O escore SoVI e o código ordinal de 1 a 5 usado na análise em R são medidas diferentes.

Quando o eixo horizontal mostra a **chuva**, o gráfico usa os oito perfis municipais mais próximos dos valores numéricos de SoVI e ICM escolhidos. As barras usam intervalos de chuva; o resumo numérico usa a chuva escolhida com tolerância mínima de ±10 mm ou cerca de 12% do valor. Quando o eixo mostra **SoVI**, compara cinco intervalos numéricos entre municípios com ICM até dois pontos acima ou abaixo do escolhido e com chuva na tolerância indicada. Mover o controle dentro do mesmo intervalo pode mudar os exemplos municipais, mas não a altura da barra agregada. Quando o eixo mostra **ICM**, compara cinco faixas de pontuação apenas entre municípios com SoVI até 0,5 ponto acima ou abaixo do escore escolhido e com chuva na tolerância indicada. A barra destacada corresponde ao intervalo que contém o valor selecionado. `n` é o número de município-dias em Registros e o número de protocolos nas análises de dano.

O gráfico **Municípios por SoVI e capacidade municipal** usa os mesmos controles. Cada ponto representa um dos 128 municípios da amostra, posicionado por seu escore SoVI e ICM. A intensidade da cor mostra o desfecho observado naquele município em dias ou protocolos cuja chuva se encontra na tolerância indicada. O ponto amarelo representa o perfil hipotético: arrastá-lo, ou clicar na área vazia do gráfico, altera SoVI e ICM nos dois gráficos. Clicar em um município mostra seu valor e o denominador `n`. Pontos tracejados têm menos de 30 dias comparáveis em Registros ou menos de 10 protocolos nas análises de dano; são alertas visuais, não um teste formal de significância. Municípios sem observações comparáveis aparecem sem valor estimado.

As faixas extremas e algumas combinações de chuva, SoVI e ICM têm poucos municípios ou protocolos. A interface sinaliza amostras pequenas; barras pouco preenchidas devem ser lidas com cautela. Os índices SoVI e ICM representam características municipais e não variam dia a dia neste recorte. O painel é uma **descrição retrospectiva**; as barras não são coeficientes dos modelos ajustados da REV18, previsões ou evidência causal. O modelo ajustado do artigo considera outros controles e interações e deve continuar sendo a referência para inferência.

## Fontes e atribuição

- Registros de desastres e danos humanos: [Atlas Digital de Desastres no Brasil (MIDR)](https://atlasdigital.mdr.gov.br/).
- Precipitação: [EPAGRI/CIRAM](https://ciram.epagri.sc.gov.br/dadosambientaispublicos/), com complementação de lacunas pelo [INMET/BDMEP](https://portal.inmet.gov.br/servicos/bdmep-dados-hist%C3%B3ricos), conforme tratamento da pesquisa.
- SoVI: dados fornecidos por Júlia Boelter Nickel e atribuídos ao [trabalho de conclusão de curso no Repositório da UFSC](https://repositorio.ufsc.br/handle/123456789/264180). As faixas acompanham essa fonte; a codificação de 1 a 5 para uso no R foi feita pelo autor desta pesquisa.
- Capacidade municipal (ICM): [Indicador de Capacidade Municipal, MIDR](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/icm).

O painel foi concebido para testar a interação visual antes de qualquer incorporação ao site principal. Não reutilizar seus números como resultados finais do Artigo 03 sem confrontá-los com as tabelas e o manuscrito REV18.
