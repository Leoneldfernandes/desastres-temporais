# Ponto de retorno do layout temporal

Antes da reorganização aprovada em 09/10/2026, a interface publicada era a **v0.62**.

- Branch preservada: `backup/layout-temporal-v0.62`.
- Commit: `032814a9002b5311bd99bd6ed9228426e4666618`.
- Referência permanente: https://github.com/Leoneldfernandes/desastres-no-brasil/tree/032814a9002b5311bd99bd6ed9228426e4666618

Essa referência guarda o código completo anterior: mês à esquerda, reprodução ao centro e velocidade com abertura da série à direita, com o reflow anterior nas telas menores. Inclui os ajustes de transparência da v0.62.

## Como retornar ao layout anterior

Preparar um novo PR sobre a versão vigente, consultando o ponto de retorno. Restaurar apenas os trechos de layout temporal alterados por esta reorganização em `assets/css/app.css`, a ordem dos grupos em `index.html` e as expectativas correspondentes em `tests/test_temporal_analysis.py` e `tests/test_shared_view.py`. Preservar as demais mudanças feitas desde então, inclusive dados e transparência.

Depois, atualizar o hash de cache do CSS em `index.html`, identificar a publicação pelo número do novo PR e registrar a reversão no histórico. A data original de implementação permanece **20/08/2026**. Conferir novamente reprodução, abertura e fechamento da série, alinhamento dos controles e adaptação às telas menores.
