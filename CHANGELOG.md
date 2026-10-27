# Versões do site

A versão do site identifica a interface publicada e é independente da versão da base do Atlas. Na publicação do PR #73, a identificação adotada é `v0.73`, vinculada ao número do PR conforme a preferência do responsável pelo projeto. As versões anteriores permanecem registradas com sua numeração original.

## Regra de atualização

O PR #73 identifica o site como `v0.73`, conforme a liberação autorizada. A indicação da próxima atualização será decidida pelo responsável pelo projeto; não acrescentar um terceiro número automaticamente. A primeira versão completa (`1.0`) também depende dessa decisão.

A nova versão só passa a identificar o site após a incorporação e publicação do PR. No PR que muda a versão, atualizar juntos a seção Atualização do site em `index.html`, a identificação no `README.md` e este histórico. A seção mostra a versão, a data de implementação original do site e a última atualização. A data original é fixa: **20/08/2026**, confirmada pela [primeira publicação bem-sucedida no GitHub Pages](https://github.com/Leoneldfernandes/desastres-no-brasil/actions/runs/32402841959). Ao publicar uma nova versão, atualizar apenas a versão e a data da última atualização; preservar a data original. A navegação Mapa / Dashboard / Sobre foi introduzida em `0.43.0`.

## 0.73 — 26/10/2026 · PR #73

- Libera a indexação da página principal, trocando `noindex, follow` por `index, follow`, conforme nova autorização explícita do responsável em 26/10/2026.
- Preserva título, descrição, URL canônica, sitemap, metatag de propriedade, créditos, dados, controles e consentimento do Analytics.
- Mantém a página auxiliar de revisão fora das buscas e sincroniza versão, documentação e prévia. Implementação original preservada em 20/08/2026.
- Registra no PR o resultado da publicação e das etapas externas no Search Console, sem presumir inclusão nos resultados a partir do deploy.

## 0.72 — 26/10/2026 · PR #72

- Publica título e descrição aprovados, URL canônica e sitemap de um único endereço, preservando o cabeçalho, os textos de autoria e a navegação.
- Mantém `noindex` temporário na publicação autorizada e documenta a liberação explícita após a qualificação; envio do sitemap e solicitação de indexação permanecem pendentes.
- Acrescenta validação dos metadados e sitemap e esclarece a localização do robots.txt na raiz do host.
- Inclui a metatag real fornecida pelo Search Console da conta do responsável; a propriedade foi adicionada, mas a confirmação depende da publicação e verificação.
- Publicação da v0.72 com noindex autorizada pelo responsável em 26/10/2026. Data de atualização e prévia sincronizadas; implementação original em 20/08/2026 preservada. A liberação para busca depende de autorização específica após a qualificação.

## 0.70 — 16/10/2026 · PR #70

- Inclui convite opcional para tela cheia no celular e recolhimento de controles após cinco segundos sem interação, com mês, pausa, recuperação e saída sempre acessíveis.
- Afasta a escala quando ela cruza o reprodutor, incluindo tablets, preservando o posicionamento sem colisão.
- Inclui três atalhos discretos no parágrafo Como interpretar: A de Ausência (amplo), l de limitações (intermediário) e c de correções (compacto), preservando o texto e sua aparência.
- Publicação autorizada pelo responsável em 16/10/2026. Implementação original preservada em 20/08/2026. Conferência publicada registrada no PR #70; toque no S23 Ultra aprovado pelo responsável em 16/10/2026. Issues #17 e #69 encerradas.

## 0.68 — 11/10/2026 · PR #68

- Corrige a largura das informações de Atualizações em Opções no celular, usando toda a largura disponível e a rolagem do menu.
- Posiciona a escala acima do reprodutor nas telas móveis, preservando a leitura da data final do período e o comportamento de tela cheia.
- Ajustes identificados na conferência real da v0.67; mantém os estilos de desktop.

## 0.67 — 10/10/2026 · PR #67

- Reorganiza telas pequenas com cabeçalho compacto, menu Opções (aparência, atualizações e privacidade), ferramentas em duas colunas e reprodutor menor, preservando os estilos de desktop.
- Substitui a legenda fixa no celular por Legenda do mapa recolhível, com as 16 cores de tipologias da própria base, borda de múltiplas tipologias e ausência de eventos.
- Restringe o efeito de hover a dispositivos com ponteiro preciso e suporte real a hover: durante a reprodução, o fundo mantém opacidade de 50% por toque, com transição suave; textos e botões permanecem sólidos. O foco por teclado continua restaurando o contraste.
- Mantém os controles reais de aparência e atualização ao alternar orientação/tamanho, sem duplicar campos ou decisões de consentimento.
- Amplia as dimensões da página de revisão para celular em pé/deitado e tablet em ambas as orientações.

## 0.66 — 09/10/2026 · PR #66

- Permite abrir Filtros e indicadores e Resultados e impactos simultaneamente no modo compacto, com abertura e fechamento independentes.
- Mantém os dois painéis lado a lado onde há largura; em janelas estreitas, organiza-os um acima do outro com rolagem própria e fechamento acessível.
- Centraliza as abas Mapa, Dashboard e Sobre no cabeçalho dos modos intermediário e compacto, usando uma linha própria quando faltar largura.
- Preserva filtros, mês, controles do reprodutor e o visual amplo aprovado.
- Centraliza as setas de mês anterior e próximo com ícones vetoriais, preservando o alinhamento e o tamanho dos botões junto ao Reproduzir.
- Centraliza o mês, o ano e o valor dentro da caixa informativa da série temporal, incluindo ocorrências e os demais indicadores.

## 0.65 — 09/10/2026 · PR #65

- Corrige a precedência das regras do cabeçalho em janelas abaixo de 1180 pixels, evitando que o menu direito fique fora da tela.
- Recolhe a série temporal ao abrir um painel flutuante, preservando as seleções e evitando que os quadros fiquem sem espaço em janelas baixas.
- Evita sobreposição dos controles de zoom com as ferramentas do mapa no celular.

- Permite escolher o estilo intermediário ou compacto pela URL, inclusive em Full HD, com `layout=intermediario` ou `layout=compacto`.
- Preserva a escolha ao navegar pelos meses, mudar filtros e compartilhar; sem o parâmetro, mantém a adaptação automática.
- Mantém o compacto em janelas abaixo do espaço mínimo do intermediário.
- Acrescenta a escolha de estilo à página de revisão e identifica sua URL por versão para evitar uma prévia antiga em cache.

## 0.64 — 09/10/2026 · PR #64

- Adota estilos amplo, intermediário e compacto pela largura e altura úteis da janela, inclusive ao mudar o zoom do navegador.
- Mantém o desktop amplo e reutiliza os quadros em painéis com abertura manual e rolagem nas telas menores, preservando filtros e o alinhamento do reprodutor.
- Corrige a compressão e a sobreposição do conteúdo das camadas temáticas.
- Acrescenta zoom cartográfico em passos de 0,25 e enquadramento panorâmico adaptado sem sobrescrever a navegação manual.
- Amplia a prévia com janelas de 720 e 620 pixels de altura e equivalentes de zoom de página.

## 0.63 — 09/10/2026 · PR #63

- Posiciona os controles de reprodução à esquerda, o mês no centro da barra e velocidade com abertura da série à direita.
- Uniformiza a altura dos controles e alinha suas bordas; mantém os rótulos centralizados acima do mês e da velocidade.
- Adapta o agrupamento à largura disponível em telas menores, preservando a legibilidade e os controles de toque.
- Preserva os ajustes de transparência, a reprodução e o gráfico. Guarda a v0.62 na branch `backup/layout-temporal-v0.62` e documenta a reversão em [Ponto de retorno do layout temporal](docs/reversao-layout-temporal.md).

## 0.62 — 09/10/2026 · PR #62

- Aplica 50% de opacidade somente ao fundo dos espaços entre os quadros laterais durante a reprodução, com transição suave de 600 ms.
- Recupera o fundo sem transparência ao pausar ou interromper a reprodução, incluindo as pausas automáticas.
- Preserva as cores e a opacidade dos quadros, tabelas, textos e botões, o layout e o fundo da barra temporal já aprovado.
- Respeita a preferência por movimento reduzido. Os espaços laterais continuam fora da área do mapa; a transparência não estende o mapa por baixo deles.

## 0.60 — 09/10/2026 · PR #60

- Reduz o fundo da barra temporal durante a reprodução para 50% da opacidade habitual, para aumentar a visibilidade do mapa durante a reprodução.
- Preserva a transição de 600 ms, a recuperação do fundo ao pausar ou usar os controles, as dimensões da barra e a opacidade integral dos textos e botões.

## 0.59 — 09/10/2026 · PR #59

- Aumenta a largura de cada aba em 10%, mantendo a sobreposição de 12 pixels e o conjunto centralizado sobre o mapa.
- Corrige a ordem visual: Mapa à frente de Dashboard, Dashboard à frente de Sobre; a aba selecionada sempre assume o primeiro plano.
- Mantém altura, textos e adaptação às telas menores.
- Aumenta o fundo da barra temporal durante a reprodução para 90% da opacidade habitual, mantendo transição de 600 ms e controles integralmente nítidos.

## 0.58 — 09/10/2026 · PR #58

- Ajusta o fundo durante a reprodução de 65% para 80% da opacidade habitual, após a avaliação visual do teste.
- Mantém a transição de 600 ms, a recuperação ao pausar ou usar os controles e a nitidez e dimensões da barra.

## 0.57 — 09/10/2026 · PR #57

- Testa o fundo da barra temporal a 65% da opacidade habitual durante a reprodução, preservando textos, botões, posição e dimensões.
- Aplica transição de 600 ms e recupera o fundo original ao pausar, interromper a reprodução, passar o mouse sobre a barra ou usar seus controles pelo teclado.
- Respeita a preferência por movimento reduzido. O ajuste fica isolado neste PR para facilitar a reversão se o resultado visual não agradar.

## 0.56 — 09/10/2026 · PR #56

- Move o compartilhamento para o canto superior direito do mapa e organiza as ferramentas em Buscar município, Retornar ao panorama, Tela cheia e Compartilhar.
- Uniformiza os quatro botões e mostra descrições ao passar o mouse ou usar o teclado, incluindo a lupa; preserva a confirmação “Link copiado”.
- Ajusta a posição do painel de busca e remove a linha de compartilhamento dos controles temporais em telas menores.

## 0.55 — 09/10/2026 · PR #55

- Atualiza o resultado da verificação semanal ao abrir o indicador do Atlas, sem recarregar a página ou os dados do mapa.
- Evita consultas simultâneas ao abrir e fechar o menu rapidamente; em falha de conexão, preserva a data da última verificação conhecida.
- Vincula a identificação desta publicação ao número do PR e preserva a implementação original em 20/08/2026.

## 0.43.7 — 02/10/2026

- Apresenta os autores em um quadro de largura completa, um abaixo do outro, com os mesmos tamanhos de texto e sem divisória vertical.
- Identifica Leonel Delmiro Fernandes como Engenheiro Civil (UVA), preservando a condição de mestrando em Desastres Naturais.
- Inclui Lindberg Nascimento Júnior como coautor e orientador, com o resumo biográfico aprovado e seu currículo Lattes.
- Acrescenta o vínculo acadêmico e o link do LabClima/UFSC e organiza os três quadros informativos abaixo da autoria.

## 0.43.6 — 02/10/2026

- Identifica a seção como “Sobre o projeto \"Desastres no Brasil\"”, deixando claro que apresenta a ferramenta.
- Adiciona o subtítulo “Mapa interativo de ocorrências e impactos ao longo do tempo”, com apenas quatro pixels de espaço abaixo do título.
- Remove o rótulo repetido “O projeto” e mantém um intervalo maior antes do texto de apresentação.

## 0.43.5 — 02/10/2026

- Corrige o título da seção para “Sobre os desastres no Brasil”.
- Apresenta o propósito da ferramenta logo abaixo do título, com o texto aprovado pelo autor.
- Acrescenta a biografia no quadro Autoria, identificando Leonel Delmiro Fernandes como engenheiro civil e mestrando em Desastres Naturais pela UFSC.

## 0.43.4 — 02/10/2026

- Corrige a largura efetiva dos controles do cabeçalho entre 1101 e 1599 pixels, mantendo espaço entre os controles e as abas centradas.

## 0.43.3 — 02/10/2026

- Alinha o conjunto de abas ao centro do mapa em telas largas, evitando o deslocamento para a direita em Full HD.
- Aproxima e sobrepõe discretamente as capinhas, reforçando a aba selecionada em primeiro plano.
- Mantém o tamanho das letras, suaviza as abas inativas e preserva a altura do cabeçalho.
- Disponibiliza uma página de revisão de layout em 1920 × 1080 e outras larguras, independente da interface principal.

## 0.43.2 — 02/10/2026

- Recupera as proporções da proposta visual aprovada, com abas mais largas e texto legível no cabeçalho.
- Reproduz o contorno de pasta com desenho vetorial e limita a conexão da aba selecionada à moldura, sem avançar sobre o mapa.
- Preserva as seções, os filtros e a área útil do mapa, com uma separação de apenas dois pixels abaixo da moldura.

## 0.43.1 — 02/10/2026

- Encaixa Mapa / Dashboard / Sobre no cabeçalho, como abas de pasta conectadas à moldura do conteúdo.
- Remove a faixa separada de navegação, recuperando a altura útil do mapa na visualização desktop.
- Mantém arredondamento discreto e adapta o encaixe das abas às larguras menores e aos temas claro e escuro.

## 0.43.0 — 02/10/2026

- Adiciona a navegação superior Mapa / Dashboard / Sobre, com o mapa como tela inicial.
- Preserva filtros e mês ao mudar de seção; pausa a reprodução fora do mapa e ajusta o mapa ao voltar.
- Informa que o Dashboard está em desenvolvimento, com acesso ao mapa atual.
- Inicia o Sobre com autoria, fonte Atlas Digital, limites de interpretação, metodologia e preferências de privacidade.
- Permite navegação por teclado, links diretos e histórico voltar/avançar; adapta as três opções às telas pequenas e aos temas claro e escuro.

## 0.42.4 — 02/10/2026

- Atualiza o aviso de privacidade após ativar a coleta de cidades no Google Analytics.
- Explica a localização aproximada por país, estado e cidade e os metadados técnicos de dispositivo coletados pela mesma opção.
- Preserva a coleta somente após consentimento e as configurações sem publicidade, Google Signals ou medição otimizada.

## 0.42.3 — 02/10/2026

- Move Sobre e privacidade para o rodapé do quadro Baixar dados, com ícone informativo e acesso discreto.
- Mantém Recorte territorial, Aparência e atualização no topo, com títulos centralizados.
- Centraliza Velocidade sobre o seletor e amplia sua largura para mostrar as opções completas.
- Reorganiza a série temporal pela largura disponível dentro do mapa, evitando sobreposição dos controles e corte dos indicadores.

## 0.42.2 — 01/10/2026

- Centraliza os títulos Recorte territorial e Aparência sobre seus respectivos controles.

## 0.42.1 — 01/10/2026

- Corrige a data de implementação original para 20/08/2026, mantendo a última atualização em 01/10/2026.

- Organiza os controles do topo na ordem Recorte territorial, Sobre e privacidade, Aparência e indicador de atualização.
- Uniformiza altura, largura, formato arredondado, tipografia e alinhamento dos controles, seguindo o modelo do indicador Atlas verificado.
- Mantém a ordem dos controles em quatro colunas nas telas intermediárias e duas colunas nas telas menores, com alvos de toque de 44 px.

## 0.42.0 — 01/10/2026

- Adiciona o seletor Aparência no topo: Sistema, Claro e Escuro.
- Sistema acompanha a preferência do computador e suas mudanças durante a visita.
- Escolhas manuais são salvas neste navegador e sincronizadas entre abas; sem armazenamento disponível, funcionam durante a visita.
- Adapta painéis, tabelas, gráfico temporal, controles do mapa e janelas aos dois temas.
- Mantém fixas as cores das tipologias e classes científicas do mapa.
- Mostra a versão do site, o estado Em desenvolvimento, a data de implementação e a última atualização na parte inferior do painel que abre pelo indicador no canto superior direito.
- Identifica separadamente a geração da base de dados, que vem do manifesto do Atlas.

As funcionalidades anteriores, incluindo a apresentação inicial, o consentimento para Google Analytics e os recursos do mapa, precedem o início desta numeração.

