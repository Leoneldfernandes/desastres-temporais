import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class TypeGroupTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.script = (ROOT / "assets" / "js" / "app.js").read_text(encoding="utf-8")
        cls.styles = (ROOT / "assets" / "css" / "app.css").read_text(encoding="utf-8")
        cls.methodology = (ROOT / "docs" / "metodologia.md").read_text(encoding="utf-8")

    def group_block(self, group_id: str) -> str:
        match = re.search(
            rf'id: "{re.escape(group_id)}",(?P<body>.*?)\n  \}}\),',
            self.script,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(match, group_id)
        return match.group("body")

    def assert_names_in_order(self, block: str, names: list[str]) -> None:
        type_names = block[block.index("typeNames:") :]
        positions = [type_names.index(f'"{name}"') for name in names]
        self.assertEqual(positions, sorted(positions))

    def test_three_groups_contain_the_approved_sixteen_types_once(self) -> None:
        groups = {
            "hydrological": [
                "Alagamentos",
                "Chuvas Intensas",
                "Enxurradas",
                "Inundações",
                "Movimento de Massa",
            ],
            "climate-weather": [
                "Estiagem e Seca",
                "Tornado",
                "Vendavais e Ciclones",
                "Granizo",
                "Onda de Frio",
                "Onda de Calor e Baixa Umidade",
                "Incêndio Florestal",
            ],
            "other": [
                "Erosão",
                "Doenças infecciosas",
                "Rompimento/Colapso de barragens",
                "Outros",
            ],
        }
        flattened: list[str] = []
        for group_id, names in groups.items():
            block = self.group_block(group_id)
            self.assert_names_in_order(block, names)
            flattened.extend(names)
        self.assertEqual(len(flattened), 16)
        self.assertEqual(len(set(flattened)), 16)

    def test_group_labels_are_plural_and_not_data_reclassification(self) -> None:
        for label in ("Hidrológicos", "Climatológicos e Meteorológicos", "Outros"):
            self.assertIn(f'label: "{label}"', self.script)
        self.assertIn("serve somente para facilitar a seleção coletiva e individual", self.methodology)
        self.assertIn("não cria uma nova variável", self.methodology)

    def test_group_checkbox_supports_full_partial_and_empty_state(self) -> None:
        start = self.script.index("function syncTypeGroupStates()")
        end = self.script.index("function layerStyle", start)
        body = self.script[start:end]
        self.assertIn("input.checked = selected === typeIds.length", body)
        self.assertIn("input.indeterminate = selected > 0 && selected < typeIds.length", body)
        self.assertIn("count.textContent", body)
        self.assertIn(".type-group-toggle", self.styles)

    def test_group_and_individual_changes_keep_the_same_active_type_set(self) -> None:
        start = self.script.index("function handleTypeChange(event)")
        end = self.script.index("function bindEvents", start)
        body = self.script[start:end]
        self.assertIn("event.target.dataset.typeGroup", body)
        self.assertIn("nextSelection.add(typeId)", body)
        self.assertIn("nextSelection.delete(typeId)", body)
        self.assertIn('querySelectorAll("input[data-type-id]:checked")', body)
        self.assertIn("syncTypeGroupStates()", body)

    def test_shared_view_restores_only_individual_type_inputs(self) -> None:
        start = self.script.index("function applyTypeSelection(typeIds)")
        end = self.script.index("function syncViewUrl", start)
        body = self.script[start:end]
        self.assertIn('querySelectorAll("input[data-type-id]")', body)
        self.assertIn("syncTypeGroupStates()", body)


if __name__ == "__main__":
    unittest.main()
