# Reproduz a reta descritiva SoVI–ICM a partir do recorte congelado REV18.
# Executar na raiz do repositório: Rscript dashboard/analises/tendencia_sovi_icm.R
# Opcional: passar o caminho de analogos.json como primeiro argumento.

args <- commandArgs(trailingOnly = TRUE)
dados <- if (length(args)) args[[1]] else file.path('dashboard', 'analogos.json')
if (!file.exists(dados)) stop('Arquivo não encontrado: ', dados)
if (!requireNamespace('jsonlite', quietly = TRUE)) stop('Instale o pacote jsonlite para ler o JSON.')

raw <- jsonlite::fromJSON(dados, simplifyVector = FALSE)
cidades <- data.frame(
  codigo = vapply(raw$cities, `[[`, character(1), 1),
  sovi = vapply(raw$cities, function(x) as.numeric(x[[3]]), numeric(1)),
  icm = vapply(raw$cities, function(x) as.numeric(x[[5]]), numeric(1))
)
stopifnot(!anyDuplicated(cidades$codigo), all(complete.cases(cidades)))

ajuste <- stats::lm(icm ~ sovi, data = cidades)
correlacao <- stats::cor.test(cidades$sovi, cidades$icm, method = 'pearson')
ic_inclinacao <- stats::confint(ajuste, 'sovi', level = 0.95)

cat('Municípios:', nrow(cidades), '\n')
cat('Reta: ICM =', coef(ajuste)[[1]], '+', coef(ajuste)[[2]], '* SoVI\n')
cat('r de Pearson:', unname(correlacao$estimate), '\n')
cat('R²:', summary(ajuste)$r.squared, '\n')
cat('p nominal:', correlacao$p.value, '\n')
cat('IC95% da inclinação:', ic_inclinacao[[1]], 'a', ic_inclinacao[[2]], '\n')
cat('R:', R.version.string, '\n')
cat('jsonlite:', as.character(utils::packageVersion('jsonlite')), '\n')
