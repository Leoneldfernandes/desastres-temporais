(() => {
  "use strict";

  const sections = ["mapa", "dashboard", "sobre"];
  const tabs = sections.map((name) => document.getElementById(`tab-${name}`));
  const panels = sections.map((name) => document.getElementById(`section-${name}`));
  const navigation = document.getElementById("siteNavigation");
  if (!navigation || tabs.some((tab) => !tab) || panels.some((panel) => !panel)) return;

  let current;
  function sectionFromUrl() {
    const name = window.location.hash.slice(1);
    return sections.includes(name) ? name : "mapa";
  }

  function showSection(name, { focus = false, history = false } = {}) {
    if (!sections.includes(name)) return;
    if (history && name !== current) {
      const url = new URL(window.location.href);
      url.hash = name;
      window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    sections.forEach((section, index) => {
      const selected = section === name;
      tabs[index].setAttribute("aria-selected", String(selected));
      tabs[index].tabIndex = selected ? 0 : -1;
      panels[index].hidden = !selected;
    });
    const changed = current !== name;
    current = name;
    if (focus) tabs[sections.indexOf(name)].focus({ preventScroll: true });
    if (changed) document.dispatchEvent(new CustomEvent("site-section-change", { detail: { section: name } }));
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showSection(sections[index], { history: true }));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      showSection(sections[next], { focus: true, history: true });
    });
  });

  document.querySelectorAll("[data-open-map]").forEach((button) => {
    button.addEventListener("click", () => showSection("mapa", { focus: true, history: true }));
  });
  document.getElementById("aboutPrivacy")?.addEventListener("click", () => {
    document.getElementById("openWelcome")?.click();
  });
  const restoreSection = () => {
    const focusHidden = tabs.includes(document.activeElement)
      || panels.some((panel) => panel.contains(document.activeElement));
    showSection(sectionFromUrl(), { focus: focusHidden });
  };
  window.addEventListener("popstate", restoreSection);
  window.addEventListener("hashchange", restoreSection);
  showSection(sectionFromUrl());
})();
