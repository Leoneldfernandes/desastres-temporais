# Layout responsivo do mapa

A interface acompanha a largura e a altura úteis da janela, em pixels CSS. O zoom de página do navegador altera esse espaço e pode trocar o estilo; o zoom cartográfico apenas muda o enquadramento do território.

| Estilo | Espaço disponível | Painéis |
| --- | --- | --- |
| Amplo | Largura a partir de 1600 e altura a partir de 900 | Duas laterais abertas, visual desktop preservado. |
| Intermediário | Largura a partir de 1180 e altura a partir de 680, sem atingir ambos os limites do amplo | Filtros na lateral; resultados abertos por botão sobre o mapa. |
| Compacto | Largura abaixo de 1180 **ou** altura abaixo de 680 | Ambos os painéis abertos por botões independentes; podem aparecer simultaneamente. |

Os 60–65% de área inicial do mapa são uma referência de equilíbrio do desktop aprovado, não um teto: recolher uma lateral pode liberar mais área. A abertura temporária de um painel ocupa parte do mapa sem mudar sua dimensão nem deslocar a barra temporal. Os mesmos elementos e dados são reutilizados em todos os estilos.

Painéis fechados não recebem foco. Abrir leva o foco ao botão de fechamento; fechar por esse botão ou Escape devolve o foco ao botão de abertura. Conteúdos extensos têm rolagem. Cada botão alterna apenas seu painel. Escape fecha o painel com foco ou o último aberto. Quando ambos estão abertos, ficam lado a lado a partir de 761 pixels de largura; abaixo disso, dividem verticalmente o espaço acima do reprodutor, com rolagem independente e fechamento sempre acessível. Abrir a série temporal fecha os painéis flutuantes para dar espaço ao gráfico; abrir um painel flutuante recolhe a série, preservando sua seleção, para manter os quadros acessíveis em janelas baixas. Os controles de painel ficam ocultos em tela cheia, onde apenas o mapa é exibido. Nenhum painel se recolhe por temporizador ou movimento do mouse.

O zoom do mapa usa `zoomSnap: 0.25` e `zoomDelta: 0.25`. A roda usa 240 pixels por nível completo. O limite inferior passa a 2 para permitir o enquadramento nacional em janelas baixas. A visão panorâmica acompanha o redimensionamento; quando a pessoa aproxima ou arrasta o mapa, sua escolha é mantida até retornar ao panorama.

As abas Mapa, Dashboard e Sobre ficam no centro do cabeçalho nos estilos intermediário e compacto. A partir de 1256 pixels, usam colunas simétricas; abaixo disso, ficam em uma linha própria para não disputar espaço com os controles. O estilo amplo mantém o posicionamento aprovado.

## Escolha pela URL

Acrescente `?layout=intermediario` ou `?layout=compacto` ao endereço para usar esses estilos mesmo em 1920×1080. Se já houver parâmetros, use `&layout=...` antes de `#mapa`. Sem `layout`, ou com um valor desconhecido, a escolha é automática. O parâmetro permanece ao mudar o mês, os filtros ou compartilhar a visualização.

O compacto pode ser escolhido em qualquer tamanho. O intermediário exige pelo menos 1180×680 pixels úteis; abaixo disso, a interface usa o compacto para preservar o acesso aos controles. O atalho não aparece nos menus e não é uma senha nem uma restrição de acesso.

## Conferência

Use `docs/preview-layout.html` para comparar 1920×1080, 1366×768, 1280×800, 1280×720, 1024×768, 1366×620, 1024×620 e celular. Os tamanhos de 1536×864, 1280×720 e 960×540 representam o espaço de layout de uma janela 1920×1080 com zoom de página de 125%, 150% e 200%, respectivamente; não simulam a rasterização ou a nitidez desse zoom. A prévia ajusta visualmente o iframe para caber na janela do observador; dentro dele, o layout usa o tamanho indicado a 100%.

Verificar: conteúdo e legenda dentro dos quadros; ausência de sobreposição; acesso à exportação e à privacidade por rolagem; foco e Escape; preservação das seleções; mês central e controles alinhados; reprodução e série temporal; navegação para Sobre/Dashboard; enquadramento panorâmico e zoom manual.

Para reverter, use um PR revertendo as alterações de interface do PR #64 e atualize a versão e os hashes dos arquivos. Não restaure uma base de dados antiga nem altere a data original de implementação do site (20/08/2026).

## Organização móvel (PR #67)

A camada móvel usa `(max-width: 760px), (max-width: 1000px) and (max-height: 500px)`. Ela é independente da escolha dos três estilos existentes, considerando a largura e a altura efetivamente disponíveis, em pixels CSS. Girar ou redimensionar recalcula a organização; a mesma instância de cada campo é movida entre o cabeçalho e Opções, conservando seleção e eventos. Tablets com mais espaço seguem os estilos de desktop existentes.

A legenda móvel abre sob os botões, tem rolagem própria e contém todas as tipologias e símbolos, sem virar um segundo filtro. Abrir um painel ou a série temporal recolhe a legenda; iniciar reprodução também a recolhe, mas permite consultá-la novamente durante a animação. Opções dá acesso ao diálogo original de privacidade, sem alterar a validade ou o comportamento da escolha salva.

O retorno do fundo sólido por mouse durante a reprodução exige `(hover: hover) and (pointer: fine)`. Toque não mantém hover opaco. O fundo continua em 50% durante reprodução e sólido ao pausar, com transição de 600 ms (sem animação quando o sistema solicita movimento reduzido).
