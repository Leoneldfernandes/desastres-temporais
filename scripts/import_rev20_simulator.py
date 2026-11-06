"""Import the original REV20 simulator layout into the test Dashboard.

Usage: python scripts/import_rev20_simulator.py SOURCE.html

SOURCE.html is Simulador_chuva_municipio_REV20.html from the Article 2 REV20
audit folder. The approved JSON is checked against the existing site data;
this script changes presentation only and does not reestimate models.
"""

import json
import re
import sys
from pathlib import Path


def one(pattern: str, source: str, label: str) -> re.Match[str]:
    matches = list(re.finditer(pattern, source, re.DOTALL))
    if len(matches) != 1:
        raise ValueError(f"Expected one {label}; found {len(matches)}")
    return matches[0]


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import_rev20_simulator.py SOURCE.html")
    source = Path(sys.argv[1]).read_text(encoding="utf-8")
    css = one(r"<style>\s*(.*?)\s*</style>", source, "style block")
    data = one(r'<script id="dataset" type="application/json">(.*?)</script>', source, "data block")
    script = one(r"<script>\s*(.*?)\s*</script>", source, "interaction script")
    markup = one(r'(<main class="wrap">.*?</main>)', source, "simulator markup")

    site = Path(__file__).resolve().parent.parent
    target = site / "dashboard"
    parsed = json.loads(data.group(1))
    approved = json.loads((target / "simulador-rev20-data.json").read_text(encoding="utf-8"))
    if parsed != approved or len(parsed["municipios"]) != 128 or len(parsed["eventos"]) != 1054:
        raise ValueError("REV20 data differ from the approved site JSON")
    if not any(city["id"] == "4205407" for city in parsed["municipios"]):
        raise ValueError("Florianópolis is absent from the approved sample")

    markup_text = markup.group(1)
    city_heading = "<h2>1 · Escolha o município e o mês</h2>"
    city_scope = (
        '<p class="muted">A lista inclui 128 dos 295 municípios de Santa Catarina '
        'com observações de chuva, SoVI e ICM na amostra analítica REV20 '
        '(2017–2025). Um município ausente da lista não significa ausência de '
        'desastres.</p>'
    )
    if markup_text.count(city_heading) != 1:
        raise ValueError("Unexpected municipality heading")
    markup_text = markup_text.replace(city_heading, city_heading + city_scope, 1)

    js = script.group(1).strip()
    original = "const data=JSON.parse(document.getElementById('dataset').textContent);"
    replacement = """(async () => {
let data;
try {
  const response = await fetch('simulador-rev20-data.json?v=1');
  if (!response.ok) throw new Error('Data request failed');
  data = await response.json();
} catch (_) {
  document.querySelector('main.wrap').textContent = 'Não foi possível carregar os dados do simulador.';
  return;
}"""
    if js.count(original) != 1:
        raise ValueError("Unexpected dataset initializer")
    js = js.replace(original, replacement, 1)
    old_default = "data.municipios.find(x=>x.nome.toLowerCase().includes('blumenau'))||data.municipios[0]"
    if js.count(old_default) != 1:
        raise ValueError("Unexpected default municipality")
    js = js.replace(old_default, "data.municipios.find(x=>x.id==='4205407')||data.municipios[0]", 1)
    js += "\n})();\n"

    page = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Chuva e danos | Simulador exploratório REV20</title>
  <link rel="stylesheet" href="simulador-rev20.css?v=2">
  <link rel="stylesheet" href="simulador-site.css?v=2">
  <script defer src="simulador-rev20.js?v=2"></script>
  <script>
    const syncTheme = () => {
      try { document.documentElement.dataset.theme = parent.document.documentElement.dataset.theme || 'dark'; }
      catch (_) { document.documentElement.dataset.theme = 'dark'; }
    };
    syncTheme();
    try { new MutationObserver(syncTheme).observe(parent.document.documentElement, {attributes: true, attributeFilter: ['data-theme']}); }
    catch (_) {}
  </script>
</head>
<body>
""" + markup_text + """
<script>
  const reportSize = () => {
    try {
      parent.postMessage({source: 'desastres-temporais-simulador', height: Math.ceil(document.documentElement.scrollHeight) + 8}, location.origin);
    } catch (_) {}
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(reportSize).observe(document.body);
  window.addEventListener('load', reportSize);
  document.fonts?.ready.then(reportSize);
</script>
</body>
</html>
"""

    (target / "simulador-rev20.html").write_text(page, encoding="utf-8")
    (target / "simulador-rev20.js").write_text(js, encoding="utf-8")
    (target / "simulador-rev20.css").write_text(css.group(1).strip() + "\n", encoding="utf-8")
    print(f"Imported original layout with {len(parsed['municipios'])} municipalities and {len(parsed['eventos'])} historical days")


if __name__ == "__main__":
    main()
