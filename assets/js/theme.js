(() => {
  "use strict";

  const storageKey = "desastres-color-theme-v1";
  const validChoice = (value) => ["system", "light", "dark"].includes(value);
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let choice = "system";
  let selector;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (validChoice(saved)) choice = saved;
  } catch (_) { /* A aparência funciona mesmo sem armazenamento disponível. */ }

  function applyTheme() {
    const theme = choice === "system" ? (systemTheme.matches ? "dark" : "light") : choice;
    document.documentElement.dataset.theme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = theme === "dark" ? "#07111f" : "#f3f7fb";
    if (selector) selector.value = choice;
  }

  // Executado antes do CSS para evitar um primeiro quadro no tema incorreto.
  applyTheme();
  systemTheme.addEventListener("change", () => {
    if (choice === "system") applyTheme();
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    choice = validChoice(event.newValue) ? event.newValue : "system";
    applyTheme();
  });
  document.addEventListener("DOMContentLoaded", () => {
    selector = document.getElementById("themeSelector");
    if (!selector) return;
    selector.hidden = false;
    selector.closest("label").hidden = false;
    selector.value = choice;
    selector.addEventListener("change", () => {
      if (!validChoice(selector.value)) return;
      choice = selector.value;
      applyTheme();
      try { window.localStorage.setItem(storageKey, choice); } catch (_) { /* Só nesta visita. */ }
    });
  });
})();
