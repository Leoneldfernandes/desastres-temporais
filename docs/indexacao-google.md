# Pesquisa Google — liberação e acompanhamento

## Estado em 26/10/2026

O responsável autorizou liberar a indexação imediatamente em 26/10/2026. Essa decisão substitui a espera anteriormente prevista até a qualificação. O PR #73 altera a página principal de `noindex, follow` para `index, follow` e identifica a publicação como v0.73. A implementação original permanece em 20/08/2026.

A preparação do PR #72 já havia publicado os metadados, o sitemap e a metatag de propriedade. A propriedade de prefixo foi adicionada no Search Console da conta do responsável. O estado final da publicação, da confirmação de propriedade, do envio do sitemap e do pedido manual de indexação é registrado no PR #73, conforme cada etapa for realmente concluída.

Permitir indexação, confirmar a propriedade, enviar sitemap, solicitar rastreamento e aparecer nos resultados são etapas diferentes. Nenhuma conclusão externa é presumida a partir dos testes ou do deploy. Não há campanha paga.

## Redação aprovada

- Título do navegador e sugestão para a pesquisa: **Desastres no Brasil | Mapa interativo de ocorrências e impactos**.
- Descrição: **Explore dados do Atlas Digital de Desastres no Brasil: ocorrências, danos humanos e prejuízos econômicos por município, em um mapa interativo.**

O cabeçalho visível, o subtítulo e as biografias permanecem iguais. O Google pode escolher outro título ou trecho conforme a consulta; a redação não garante exibição literal. Alterações futuras são possíveis, mas dependem de novo rastreamento para serem reconhecidas.

## Arquivos e endereços

- `index.html`: metadados em HTML inicial, uma URL canônica absoluta, metatag real de propriedade e `index, follow`.
- `sitemap.xml`: somente `https://leoneldfernandes.github.io/desastres-no-brasil/`, sem filtros, fragmentos, datas fictícias ou páginas de revisão. As abas pertencem ao mesmo documento; os links compartilhados continuam funcionando.
- `docs/preview-layout.html`: permanece com `noindex, nofollow`; essa página técnica não faz parte do sitemap.
- `tests/test_search_metadata.py`: valida metadados, propriedade, coerência sitemap/canônico, permissão da página principal e exclusão da prévia.

Não se adiciona `robots.txt` à pasta do projeto: esse arquivo só controla o rastreamento na raiz do host, em `https://leoneldfernandes.github.io/robots.txt`. O sitemap pode ser enviado diretamente pelo Search Console. Não bloquear o rastreador se ele precisar ler uma futura regra noindex.

## Propriedade no Search Console

Usar a propriedade **Prefixo do URL** com o endereço exato:

`https://leoneldfernandes.github.io/desastres-no-brasil/`

O domínio `github.io` não pertence ao responsável e não deve ser escolhido para verificação DNS. A metatag HTML foi obtida na interface real do Google em 26/10/2026 e publicada pelo PR #72. Ela deve permanecer na página após a verificação. Não criar token fictício nem presumir que o Analytics confirma a propriedade: a coleta depende de consentimento e tem configuração própria.

Na conferência da v0.72, o acesso ao Search Console não foi retomado após a sessão sair da conta; a propriedade não foi declarada confirmada. A retomada e os resultados da nova tentativa devem ser registrados no PR #73 sem expor credenciais.

## Fluxo de liberação autorizado

1. Publicar o PR #73 com `index, follow` e verificar no endereço público os metadados, a versão/data, a metatag de propriedade e o sitemap. Preservar autoria, controles, dados e consentimento.
2. Na conta do responsável no Search Console, concluir a verificação pelo método Tag HTML, se ainda estiver pendente.
3. Enviar `https://leoneldfernandes.github.io/desastres-no-brasil/sitemap.xml` e conferir o resultado retornado pelo Google.
4. Inspecionar a URL principal, conferir a possibilidade de indexação e solicitar inclusão. Só registrar solicitação concluída quando o Google confirmar seu recebimento.
5. Acompanhar os relatórios de indexação e desempenho. A existência de um pedido ou sitemap não garante inclusão, prazo, título literal nem posição na busca.

## Se o responsável quiser voltar ao noindex

Em nova revisão autorizada, trocar apenas a página principal para `noindex, follow`, atualizar a versão/data e o teste da regra esperada e publicar. Manter a metatag de propriedade. Não usar robots.txt para tentar substituir noindex. A regra precisa ser lida pelo rastreador; a saída dos resultados não é instantânea. O noindex não torna o site privado nem impede acesso pelo link ou cópias.

## Fontes oficiais

- [URL canônica e páginas duplicadas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=pt-br).
- [Criar e enviar um sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?hl=pt-br).
- [Bloqueio com noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing?hl=pt-br).
- [Local correto do robots.txt](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt?hl=pt-br).
- [Verificar a propriedade](https://support.google.com/webmasters/answer/9008080?hl=pt-BR).
- [Solicitar novo rastreamento](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl?hl=pt-BR).
