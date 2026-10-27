# Reprodução móvel e atalhos de visualização

## Experiência publicada na v0.70

- Na primeira reprodução de cada visita (aba/sessão), oferecer **Tela cheia** e **Agora não**, sem interromper nem forçar a reprodução. O armazenamento funcional é opcional e não contém dados de visitantes.
- Em tela cheia móvel, recolher a barra e as ferramentas após **5 segundos sem interação**. Seleção ativa, menus abertos, foco por teclado, pausa, gráficos expandidos e aba oculta impedem o recolhimento.
- Manter sempre **Sair**, mês atual, **Pausar** e **Controles** acessíveis. Controles recupera a barra sem pausar. Pausar e o fim da reprodução restauram a barra. Sair retorna ao layout anterior, preservando mês e filtros.
- Usar o modo ampliado existente quando a tela cheia nativa estiver indisponível. Toques no mapa continuam consultando municípios; não recuperam os controles.
- A escala permanece acima dos créditos e só recebe afastamento extra quando sua posição cruza o reprodutor. O afastamento acompanha redimensionamento e zoom; o desktop sem colisão conserva sua posição.

## Atalhos discretos em Como interpretar

No parágrafo de **Como interpretar**, dentro de **Sobre**, os três links estão nas letras definidas pelo responsável:

| Local exato | Destino |
| --- | --- |
| **A** inicial da primeira ocorrência de **Ausência** | Amplo |
| **l** inicial de **limitações** | Intermediário |
| **c** inicial da última palavra **correções** | Compacto |

São links diretos, acionados com um clique ou toque; não há menu oculto, sequência de cliques ou acionador no título Sobre. Texto, cor, fonte e espaçamento do parágrafo são mantidos. Não há sublinhado, alteração de cor ao passar o mouse, tooltip ou cursor de link. A navegação por teclado preserva o indicador de foco e os links têm nomes acessíveis. O texto visível não explica os atalhos; o registro fica nesta documentação.

**Amplo** remove o modo forçado e retorna ao comportamento automático: em 1920×1080 recupera o amplo aprovado; em janelas menores mantém a adaptação por largura e altura. Não força o desktop amplo em uma tela onde ele não cabe.

Os links alteram apenas o parâmetro `layout` e o fragmento para `#mapa`. Mês, território, tipologias, município e contexto da série são preservados. Os limites de largura e altura continuam valendo: o pedido intermediário usa compacto onde falta espaço. Trata-se de conveniência discreta, não de autenticação ou controle de acesso.

## Validação concluída

O [PR #70](https://github.com/Leoneldfernandes/desastres-no-brasil/pull/70) foi incorporado e a v0.70 publicada em 16/10/2026, após autorização explícita. Foram aprovados 81 testes Python e 50 Node, incluindo temporizador, interação/foco, URLs dos atalhos, colisão da escala, hashes e integridade dos dados. CI da main e GitHub Pages concluídos com sucesso.

Conferência no site publicado, com zoom interno de 100%: 1920×1080 (três estilos), 1366×768, 768×1024, 820×1180, 1024×768, 1180×820, 412×860, 320×568 e 860×412. Desktop Full HD preserva mapa 1283×982 e reprodutor 820×119. Nos tablets afetados, a escala termina 12 px acima da barra; nas posições sem colisão, mantém o afastamento anterior. Sem rolagem horizontal nas janelas conferidas.

Foram conferidos convite opcional, recolhimento, recuperação sem pausar, pausa no primeiro clique, saída, proteção da série expandida e do foco por teclado, privacidade, busca e compartilhamento. Os três atalhos preservaram SC, novembro/2025, Granizo e Florianópolis, com o parágrafo visualmente inalterado.

Em 16/10/2026, o responsável confirmou a verificação por toque no seu S23 Ultra após receber a lista de testes de tela cheia, controles, pausa, saída, busca, filtros, velocidade e orientação. A [Issue #17](https://github.com/Leoneldfernandes/desastres-no-brasil/issues/17) foi encerrada. A [Issue #69](https://github.com/Leoneldfernandes/desastres-no-brasil/issues/69), dos atalhos, também está concluída.

A conferência por janelas simuladas e a aprovação no S23 Ultra não representam testes físicos de todos os tablets ou navegadores. O navegador móvel utilizado não foi informado; não há validação individual de fullscreen nativo por navegador.
