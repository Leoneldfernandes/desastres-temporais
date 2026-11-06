# Gráfico 3 — simulador exploratório REV20

Esta seção do Dashboard apresenta um **cenário condicionado à chuva informada pelo visitante**. O programa não prevê a chuva. Foi preparado a partir da análise REV20 do estudo hoje organizado como **Artigo 2 — chuva de estações, vulnerabilidade e danos** (antigo Artigo 03). Não altera os modelos de associação nem as tabelas dos 19 cenários do artigo.

## O que aparece

- **Chance de registro:** probabilidade estimada de ao menos um protocolo do Atlas naquele município-dia. Modelo logístico com chuva acumulada de 1 dia, SoVI, ICM e mês.
- **Chance de dano humano se houver registro:** probabilidade estimada de dano humano informado positivo entre os dias com registro. Modelo logístico com chuva de 6 dias, SoVI, ICM e mês.
- **Média de danos humanos se houver registro:** média estimada da soma dos danos informados nos protocolos daquele dia, **incluindo dias registrados com zero**. Modelo de Poisson com `log(1 + chuva acumulada de 3 dias em unidades de 10 mm)`, SoVI, ICM e mês. A soma não representa pessoas únicas.

Os modelos compartilhados foram ajustados em **2017–2023** e conferidos em **2024–2025**. O município selecionado fornece os valores fixos de SoVI e ICM; o mês e as seis chuvas diárias completam o cenário. A amostra contém 128 municípios com dados completos para esta análise. Os 1.054 episódios da tabela histórica são dias com registro, não todas as observações usadas no ajuste de registro.

## Interação das chuvas

As seis entradas representam hoje e os cinco dias anteriores em uma data hipotética. O gráfico de 1 dia altera somente hoje. O de 3 dias mantém hoje e redistribui a diferença entre ontem e anteontem na proporção já informada; se ambos eram zero, divide igualmente. O de 6 dias mantém os três dias mais recentes e redistribui a diferença entre os três anteriores da mesma forma. Os acumulados são derivados da chuva diária; não são entradas independentes. A lista histórica mostra até dois episódios do município escolhido com chuvas acumuladas mais próximas, sem afirmar que os desfechos serão iguais.

## Limites para interpretar

No teste temporal de 2024–2025, o modelo de contagem teve **MAE de 88,91 danos informados por dia registrado** e previu 22.088 danos frente a 16.473 observados (**34,1% acima**). Os valores de contagem são especialmente incertos em chuvas extremas. A interface avisa quando um acumulado ultrapassa a maior chuva do treino: 254,8 mm em 1 dia, 384 mm em 3 dias ou 498 mm em 6 dias. Esse aviso indica extrapolação; o recurso não foi validado para alerta ou decisão operacional. As estimativas são associações observacionais, não efeitos causais.

## Dados, reprodução e fontes

Os dados foram congelados na REV20. A chuva segue a prioridade EPAGRI/Ciram, com INMET íntegro como complemento; chuva ausente não foi convertida em zero. Os coeficientes foram exportados pelo script R `06_exportar_dados_simulador_REV20.R` (`stats`, R 4.6.1) e o artefato original foi montado por `07_montar_simulador_REV20.py` (biblioteca padrão). Ambos e o documento `LEIA_ME_simulador_REV20.md` estão na pasta de auditoria `Dissertacao_Organizada/Artigo_2_Chuva_vulnerabilidade_e_danos/Auditoria_e_documentacao/REV20/Previsao_exploratoria/` do projeto de pesquisa. O importador deste repositório, `scripts/import_rev20_simulator.py`, separa a prévia aprovada em HTML, CSS, JavaScript e JSON para revisão do site, sem reestimar os modelos. O JSON contém os coeficientes e o histórico necessários à execução local da interface.

- [Atlas Digital de Desastres no Brasil, MIDR](https://atlasdigital.mdr.gov.br/): protocolos e danos declarados.
- [EPAGRI/Ciram](https://ciram.epagri.sc.gov.br/dadosambientaispublicos/) e [INMET/BDMEP](https://portal.inmet.gov.br/servicos/bdmep-dados-hist%C3%B3ricos): precipitação tratada na REV20.
- [Júlia Boelter Nickel, TCC na UFSC](https://repositorio.ufsc.br/handle/123456789/264180): fonte do SoVI e dos índices de vulnerabilidade da pesquisa.
- [Indicador de Capacidade Municipal, MIDR](https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/icm): ICM.

Para alterar os modelos ou dados, revisar primeiro a documentação e a validação temporal da REV20. A interface apenas calcula os valores das fórmulas já exportadas.
