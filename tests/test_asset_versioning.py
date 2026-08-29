import hashlib
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


ROOT = Path(__file__).resolve().parents[1]
VERSIONED_ASSETS = (
    "assets/css/app.css",
    "assets/js/export.js",
    "assets/js/export-worker.js",
    "assets/js/app.js",
)


class AssetReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(
        self, tag: str, attrs: list[tuple[str, str | None]]
    ) -> None:
        attributes = dict(attrs)
        if tag == "link" and attributes.get("href"):
            self.references.append(str(attributes["href"]))
        if tag == "script" and attributes.get("src"):
            self.references.append(str(attributes["src"]))
        if tag == "script" and attributes.get("data-export-worker"):
            self.references.append(str(attributes["data-export-worker"]))


class AssetVersioningTests(unittest.TestCase):
    def test_interface_assets_use_their_content_hash(self) -> None:
        parser = AssetReferenceParser()
        parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))

        for asset in VERSIONED_ASSETS:
            with self.subTest(asset=asset):
                references = [
                    reference
                    for reference in parser.references
                    if urlsplit(reference).path == asset
                ]
                self.assertEqual(len(references), 1)

                version = parse_qs(urlsplit(references[0]).query).get("v")
                expected = hashlib.sha256((ROOT / asset).read_bytes()).hexdigest()[:12]
                self.assertEqual(version, [expected])


if __name__ == "__main__":
    unittest.main()
