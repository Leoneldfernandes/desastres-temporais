"""Import the approved REV20 visualization fragment as reviewable site assets.

Usage: python scripts/import_rev20_simulator.py PATH_TO_SOURCE_FRAGMENT.html
The source is produced by the Article 2 REV20 workflow; this script does not
fit models or alter its coefficients or observations.
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
    data = one(r'<script id="tj-data" type="application/json">(.*?)</script>', source, "data block")
    script = one(r"<script>\s*(.*?)\s*</script>", source, "interaction script")
    parsed = json.loads(data.group(1))
    if len(parsed["municipios"]) != 128 or len(parsed["eventos"]) != 1054:
        raise ValueError("REV20 sample size differs from the approved candidate")
    markup = source
    for match in sorted((css, data, script), key=lambda match: match.start(), reverse=True):
        markup = markup[: match.start()] + markup[match.end() :]
    markup = markup.strip()
    markup = re.sub(r"(?m)^[ \t]+$", "", markup)
    if not markup.startswith('<div id="tres-janelas-rev20">') or not markup.endswith("</div>"):
        raise ValueError("Unexpected visualization markup")

    js = script.group(1).strip()
    original = "const data = JSON.parse(q('tj-data').textContent);"
    replacement = """let data;
  try {
    const response = await fetch('simulador-rev20-data.json?v=1');
    if (!response.ok) throw new Error('Data request failed');
    data = await response.json();
  } catch (_) {
    root.textContent = 'Não foi possível carregar os dados do simulador.';
    return;
  }"""
    if js.count(original) != 1 or not js.startswith("(() => {"):
        raise ValueError("Unexpected interaction script")
    js = js.replace("(() => {", "(async () => {", 1).replace(original, replacement, 1)

    page = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Simulador exploratório REV20 | Desastres Temporais</title>
  <link rel="stylesheet" href="analogos.css?v=10">
  <link rel="stylesheet" href="simulador-rev20.css?v=1">
  <link rel="stylesheet" href="simulador-site.css?v=1">
  <script defer src="simulador-rev20.js?v=1"></script>
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
""" + markup + """
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

    target = Path(__file__).resolve().parent.parent / "dashboard"
    (target / "simulador-rev20.html").write_text(page, encoding="utf-8")
    (target / "simulador-rev20.js").write_text(js + "\n", encoding="utf-8")
    (target / "simulador-rev20-data.json").write_text(data.group(1).strip() + "\n", encoding="utf-8")
    (target / "simulador-rev20.css").write_text(css.group(1).strip() + "\n", encoding="utf-8")
    print(f"Imported {len(parsed['municipios'])} municipalities and {len(parsed['eventos'])} historical days")


if __name__ == "__main__":
    main()
