import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class HeadParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_head = False
        self.in_title = False
        self.title = ""
        self.canonical = []
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "head":
            self.in_head = True
        if not self.in_head:
            return
        if tag == "title":
            self.in_title = True
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonical.append(attrs.get("href"))
        if tag == "meta" and attrs.get("name"):
            self.meta.setdefault(attrs["name"].lower(), []).append(attrs.get("content", ""))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "head":
            self.in_head = False

    def handle_data(self, data):
        if self.in_head and self.in_title:
            self.title += data


def read_head(path):
    parser = HeadParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


class SearchMetadataTests(unittest.TestCase):
    def test_test_site_has_no_canonical_or_sitemap(self):
        head = read_head(ROOT / "index.html")
        self.assertEqual(head.canonical, [])
        self.assertFalse((ROOT / "sitemap.xml").exists())
        self.assertEqual(
            (ROOT / "robots.txt").read_text(encoding="utf-8"),
            "User-agent: *\nDisallow: /\n",
        )

    def test_test_site_has_noindex_and_distinct_title(self):
        head = read_head(ROOT / "index.html")
        self.assertTrue(head.title.startswith("Desastres Temporais | "))
        self.assertEqual(len(head.meta.get("description", [])), 1)
        description = head.meta["description"][0]
        for subject in ("Ambiente de testes", "chuva", "vulnerabilidade"):
            self.assertIn(subject, description)
        self.assertNotIn("google-site-verification", head.meta)
        self.assertEqual(len(head.meta.get("robots", [])), 1)
        self.assertEqual(head.meta["robots"][0], "noindex, nofollow, noarchive")

    def test_embedded_dashboard_is_not_indexed(self):
        dashboard = read_head(ROOT / "dashboard" / "analogos.html")
        self.assertEqual(dashboard.meta["robots"], ["noindex, nofollow, noarchive"])

    def test_layout_preview_stays_out_of_search_results(self):
        preview = read_head(ROOT / "docs" / "preview-layout.html")
        self.assertEqual(len(preview.meta.get("robots", [])), 1)
        self.assertIn("noindex", preview.meta["robots"][0].split(", "))


if __name__ == "__main__":
    unittest.main()
