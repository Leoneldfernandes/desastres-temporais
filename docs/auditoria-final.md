# Auditoria final da versão desktop

Data da consolidação: 29 de agosto de 2026.

## Escopo

Esta auditoria encerra a primeira versão desktop do mapa **Desastres no tempo**. Foram verificadas a integridade científica dos dados derivados, as principais jornadas de uso, acessibilidade estrutural, desempenho inicial, automações do repositório e publicação no GitHub Pages.

A otimização específica para dispositivos móveis e a medição privada de acessos permanecem no backlog e não fazem parte desta versão.

## Integridade científica e territorial

- os 76.190 protocolos de eventos são únicos, sem duplicatas;
- as 73.744 chaves agregadas do resumo são únicas;
- a recomposição integral dos 27 arquivos estaduais coincide com o resumo publicado, sem divergência material;
- não há datas inválidas, eventos fora do período de janeiro de 1991 a dezembro de 2025, nem valores negativos;
- a malha nacional e a soma das 27 malhas estaduais contêm as mesmas 5.573 feições, sem códigos duplicados ou ausentes;
- todos os códigos municipais presentes nos eventos possuem geometria cartográfica;
- as geometrias são válidas para o contrato da aplicação: 5.537 polígonos e 36 multipolígonos;
- `scripts/validate_build.py --strict-current` foi aprovado.

Diferenças residuais de ponto flutuante ficaram limitadas a `1,82 × 10⁻¹²`, sem qualquer diferença material nos valores publicados.

## Jornadas funcionais verificadas

- seleção de Brasil, estado e município, inclusive restauração pelo endereço compartilhável;
- seleção individual e coletiva dos três grupos de tipologias;
- pesquisa municipal e retorno ao panorama do recorte;
- fechamento imediato do resumo municipal pelo panorama e fechamento automático após 4 segundos, seguido de transição de 0,7 segundo;
- abertura, fechamento e navegação por teclado da série temporal;
- mês anterior, próximo mês, barra temporal e reprodução automática;
- exportação do mês ou da série filtrada em XLSX, CSV, JSON e ZIP científico;
- retorno do foco ao botão de download após fechar a janela de exportação;
- tabela de ocorrências sem rolagem horizontal e com a coluna de danos visível.

Durante a auditoria, a coluna **Danos** foi restaurada no PR 37. A consolidação final também compactou os controles temporais para impedir que o seletor de velocidade cobrisse o botão **Próximo mês**, sem criar uma linha adicional nem reduzir a área do mapa.

## Acessibilidade

- não foram encontrados identificadores HTML duplicados;
- botões visíveis possuem nome acessível;
- campos de entrada e seletores possuem rótulos;
- imagens possuem texto alternativo;
- a página mantém uma região principal e estruturas laterais identificáveis;
- não há rolagem horizontal da página na largura desktop auditada;
- o gráfico temporal aceita foco e navegação por teclado;
- a janela de exportação mantém diálogo interno identificado e restaura o foco ao fechar.

## Desempenho e carregamento

O carregamento inicial transfere aproximadamente 3,2 MB de dados compactados: cerca de 944 KB do resumo nacional e 2,2 MB da malha simplificada. Os arquivos estáticos da interface somam aproximadamente 335 KB sem compactação.

Os dados detalhados são carregados sob demanda por unidade federativa. No recorte usado na verificação, Santa Catarina acrescentou aproximadamente 168 KB de eventos e 396 KB de geometria detalhada. O diretório completo de dados publicados ocupa cerca de 16 MB, mas não é transferido integralmente em cada visita.

Os arquivos de interface e dados usam versões de cache derivadas de conteúdo ou da geração do manifesto. Isso permite cache persistente e força atualização quando uma nova versão é publicada.

## Automação, segurança e documentação

- os testes automatizados, as verificações de sintaxe JavaScript e Python e a validação dos arquivos compactados foram aprovados;
- as ações do GitHub estão fixadas por identificador de commit e usam permissões restritas;
- a atualização semanal do Atlas mantém dados novos sujeitos a validação e incorporação manual;
- a documentação de cobertura, metodologia, exportação e atualização da base está sincronizada com o manifesto;
- não foram encontrados marcadores `TODO`, `FIXME` ou instruções `debugger` no código publicado.

## Limitações conhecidas e backlog

- a experiência desktop é o alvo formal desta versão; uma revisão responsiva completa permanece planejada para uma fase futura;
- métricas privadas de acesso não estão instaladas e deverão ser tratadas em um PR pequeno e independente, com informação de privacidade compatível com a LGPD;
- a disponibilidade dos mapas-base depende dos respectivos provedores externos;
- a conferência visual automatizada desta auditoria foi realizada em navegador Chromium desktop; outros navegadores permanecem cobertos pelos padrões web utilizados e pelos testes estruturais, mas não por uma matriz visual completa.

## Conclusão

Com as correções dos PRs 37 e 38, não permanecem falhas impeditivas conhecidas para a publicação desktop. A base, os recortes territoriais, os filtros, a série temporal, as exportações e os controles essenciais possuem validações automatizadas e verificação funcional. A primeira versão desktop pode ser considerada consolidada após a aprovação da validação contínua e da publicação do PR 38.
