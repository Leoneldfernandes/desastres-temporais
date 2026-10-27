# Desastres no Brasil — apresentação, métricas e endereço

Título aprovado: **Desastres no Brasil**.

Subtítulo: **Mapa interativo de ocorrências e impactos ao longo do tempo**.

Endereço publicado após a renomeação do repositório: `https://leoneldfernandes.github.io/desastres-no-brasil/`.

## Google Analytics 4

A propriedade **Desastres no Brasil** e seu fluxo Web foram configurados em 1 de outubro de 2026. ID de medição público: `G-3606SCXD0R`. A integração está configurada em `assets/js/visitor-config.js`, com `privacySettingsVerified: true`; cada visitante continua precisando autorizar a coleta.

A conferência administrativa registrada na ativação confirmou medição otimizada desligada, Google Signals e dados fornecidos pelo usuário não ativados, personalização de anúncios permitida em 0 de 307 regiões, compartilhamento opcional da conta desligado, retenção de usuários e eventos em dois meses sem redefinição com nova atividade e acesso restrito ao responsável. Em 02/10/2026, a coleta granular de localização e dispositivo foi ativada a pedido do responsável para permitir relatórios por cidade; o aviso foi atualizado na v0.42.4. A localização é aproximada e a mesma opção inclui metadados técnicos de dispositivo.

Este registro documenta as decisões e conferências anteriores; a revisão documental de 20/10/2026 não alterou nem reauditou as configurações privadas da conta Google. A [Issue #30](https://github.com/Leoneldfernandes/desastres-no-brasil/issues/30) registra a conclusão desta entrega. Não há contador público no mapa.

### Manutenção ou reconfiguração

As etapas abaixo servem para uma futura troca de propriedade ou revisão administrativa; não são pendências de ativação:

1. Na conta Google do responsável, criar ou selecionar uma propriedade GA4 do projeto e um fluxo de dados da Web. Usar o endereço publicado do site. O cadastro e a aceitação de termos precisam do responsável; senhas não devem ser compartilhadas no repositório ou no chat.
2. No fluxo da Web, desativar **Medição otimizada**. Isso evita eventos extras e visualizações duplicadas causadas pelas mudanças de URL dos filtros do mapa.
3. Na coleta de dados da propriedade, manter **Google Signals**, publicidade, personalização de anúncios e dados fornecidos pelo usuário desativados. Preservar a decisão aprovada de localização aproximada por país, estado e cidade, com os metadados técnicos associados; conferir os rótulos atuais no painel e manter o aviso coerente com a configuração.
4. Definir a retenção de eventos e usuários em dois meses, manter o painel privado e desativar opções de compartilhamento de dados que não sejam necessárias. Não vincular Google Ads nem conceder acesso público aos relatórios.
5. Copiar o **ID de medição** público, no formato `G-XXXXXXXXXX`, para `assets/js/visitor-config.js`. Definir `privacySettingsVerified: true` somente após conferir as opções acima. Esse ID não dá acesso de leitura à conta; não é necessário segredo de API.
6. Atualizar os hashes SHA-256 das referências de arquivos alterados em `index.html` e executar a validação.
7. No site publicado, conferir uma visita autorizada no relatório em tempo real. Em outra visita sem autorização, confirmar que nenhum script ou pedido do Analytics é enviado. Conferir também a retirada da autorização e o uso com bloqueador de anúncios.

A configuração do site não consegue auditar as opções privadas da propriedade. O campo `privacySettingsVerified` registra essa conferência; não a substitui.

## Autorização e significado dos números

A janela traz uma opção de estatísticas desligada inicialmente, “Salvar minha escolha”, “Concordo e continuar” e “Continuar sem contabilizar”. A recusa permite usar o mapa normalmente. “Sobre e privacidade” reabre as preferências; no celular, o acesso fica em **Opções → Privacidade e estatísticas de acesso**.

O Google só recebe pedidos após uma autorização válida. Usamos o modo de consentimento básico: o script não é baixado antes da escolha. Na recusa posterior, a flag oficial `ga-disable-ID` bloqueia a medição e os cookies próprios do Analytics, com prefixo `dnb`, são removidos. A decisão pode ser revista em outra aba e é armazenada localmente por até 180 dias. Cookies de Analytics usam esse mesmo prazo máximo. A retirada da autorização não apaga dados já recebidos pelo Google.

Cada carregamento autorizado envia uma visualização de página. Filtros, animação e seleção de municípios não geram eventos próprios. O endereço enviado exclui parâmetros, fragmentos e referências de origem. A contagem é desativada em localhost, navegadores automatizados, páginas ocultas e pré-renderizações; páginas que passam a ficar visíveis podem ser contadas.

O Analytics também gera eventos automáticos de sessão e engajamento. Os relatórios permitem acompanhar visualizações, sessões e estimativas de usuários. Esses valores não equivalem a um total exato de pessoas: recusas, bloqueadores, dispositivos e cookies afetam a medição. A coleta começa na ativação e não recupera visitas anteriores.

O Analytics usa cookies e informações técnicas. O Google declara que deriva localização aproximada do IP e depois descarta o endereço IP no GA4. Os dados podem ser tratados fora do Brasil. O aviso informa esses usos e contém um link para a política do Google. Publicidade e sinais opcionais estão desativados no código e devem permanecer desativados na propriedade.

## Migração do endereço e pesquisa Google

O repositório e o site já usam **desastres-no-brasil**. A apresentação, o título e o subtítulo estão publicados no endereço indicado no início deste documento. A consulta de atualização do Atlas deriva o nome do repositório do endereço do GitHub Pages.

O responsável optou pela troca do link, sem manter uma página no endereço antigo. O GitHub redireciona links do repositório, mas não o endereço do GitHub Pages. A divulgação deve usar o endereço atual.

A preparação foi publicada no PR #72 com noindex. Em 26/10/2026, o responsável autorizou liberar a indexação imediatamente: o PR #73 troca a página principal para `index, follow`, preservando título, descrição, URL canônica, sitemap e metatag de propriedade. A propriedade foi adicionada no Search Console; confirmação, envio do sitemap e pedido manual são acompanhados no PR #73. O roteiro está em [Indexação Google](indexacao-google.md). `robots.txt` só tem efeito na raiz do host, não na pasta deste projeto, e não é necessário para enviar o sitemap pelo Search Console. Permitir indexação e solicitar rastreamento não garantem prazo nem posição nos resultados.

## Navegação publicada e próxima etapa

A navegação **Mapa | Dashboard | Sobre** foi publicada na v0.43.0. O Mapa é a tela inicial; o Sobre reúne apresentação, autoria, fontes, interpretação e privacidade. O Dashboard ainda apresenta o aviso de desenvolvimento: seu conteúdo analítico depende de planejamento e proposta próprios.

Resumo semanal de métricas por e-mail ou painel permanece apenas como possibilidade futura, sem automação contratada nesta entrega.

## Referências técnicas

- [Criar uma propriedade e fluxo GA4](https://support.google.com/analytics/answer/9304153).
- [Modo de consentimento básico](https://developers.google.com/tag-platform/security/concepts/consent-mode).
- [Desativar Analytics e sinais de publicidade](https://developers.google.com/tag-platform/security/guides/privacy).
- [Visualizações manuais e medição otimizada](https://developers.google.com/analytics/devguides/collection/ga4/views).
- [Privacidade e uso dos dados pelo Google](https://policies.google.com/technologies/partner-sites?hl=pt-BR).
- [Renomear repositórios e efeito sobre GitHub Pages](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).
