# Reta exploratória entre SoVI e ICM — guardar para avaliação posterior

Esta análise foi calculada para o gráfico de pontos do painel experimental do Artigo 03. A reta foi adicionada ao Gráfico 2 do dashboard em 28/10/2026, com traço discreto e explicação de que relaciona apenas SoVI e ICM. O arquivo `tendencia_sovi_icm.R` reproduz os números abaixo a partir de `dashboard/analogos.json`, o recorte congelado REV18 de 2017–2025.

## Resultado

Cada um dos 128 municípios da amostra contribui com um par de valores: escore numérico do SoVI no eixo horizontal e pontuação do ICM no vertical. Ajuste linear simples, sem ponderação municipal:

**ICM = 13,17636 + 1,90138 × SoVI**

| Medida | Valor |
| --- | ---: |
| Correlação de Pearson, r | 0,44994 |
| R² | 0,202446 |
| p nominal | 9,91 × 10⁻⁸ |
| IC de 95% da inclinação | 1,236 a 2,567 |
| Municípios | 128 |

A associação linear é positiva e moderada; a reta descreve cerca de 20,2% da variação observada do ICM nesta amostra. O p é **nominal** porque o ajuste simples não considera dependência espacial nem possíveis fatores de confusão. Retirar Brunópolis, que tem o SoVI mais extremo, altera o R² para 0,215; a direção da reta permanece positiva.

## Uso correto no gráfico

- A reta relaciona **SoVI e ICM**, que são características municipais fixas neste recorte. Ela não muda quando o controle de chuva ou o desfecho muda.
- A intensidade da cor dos pontos continua representando registros ou danos históricos para a chuva selecionada. O R² acima **não** mede a capacidade de explicar esses desfechos.
- Se a reta for exibida futuramente, usar traço neutro e legenda “Ajuste linear SoVI–ICM”; mostrar `r`, `R²`, `n` e o caráter nominal do `p`. Manter o ponto hipotético arrastável e todos os municípios clicáveis.
- Antes de usar a relação no manuscrito, considerar a distribuição espacial dos municípios, a cobertura da amostra e o papel de características municipais associadas a ambos os índices. A figura é exploratória, não uma inferência causal.

## Reprodução e fontes

Executar da raiz deste repositório:

```text
Rscript dashboard/analises/tendencia_sovi_icm.R
```

O script usa `jsonlite` para ler o JSON e funções de `stats` para regressão, correlação e intervalo de confiança. Se esta análise entrar no artigo, referenciar os pacotes R usados, o trabalho de conclusão de curso de Júlia Boelter Nickel para o SoVI e o [Indicador de Capacidade Municipal do MIDR](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/icm), conforme as referências completas do manuscrito.
