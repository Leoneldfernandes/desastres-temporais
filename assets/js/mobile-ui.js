/* Small-screen controls reuse the desktop fields and the existing privacy dialog. */
(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const optionsButton = byId("mobileOptionsButton");
  const options = byId("mobileOptionsPanel");
  const legendButton = byId("toggleMapLegend");
  const legend = byId("mapLegendPanel");
  if (!optionsButton || !options || !legendButton || !legend) return;
  const media = window.matchMedia("(max-width: 760px), (max-width: 1000px) and (max-height: 500px)");
  const fields = [
    [document.querySelector(".field-theme"), byId("mobileAppearanceSlot")],
    [document.querySelector(".update-status-wrap"), byId("mobileUpdatesSlot")],
  ].map(([field, slot]) => {
    const anchor = document.createComment("Desktop field position");
    field.before(anchor);
    return { field, slot, anchor };
  });
  let playing = false;

  function closeUpdates() {
    if (byId("dataStatus").getAttribute("aria-expanded") === "true") byId("closeUpdateStatus").click();
  }
  function setOptions(open, returnFocus = false) {
    const wasFocused = options.contains(document.activeElement);
    if (!open) closeUpdates();
    else setLegend(false);
    options.hidden = !open;
    optionsButton.setAttribute("aria-expanded", String(open));
    if (open) byId("closeMobileOptions").focus({ preventScroll: true });
    else if (returnFocus || wasFocused) optionsButton.focus({ preventScroll: true });
  }
  function setLegend(open, returnFocus = false) {
    const wasFocused = legend.contains(document.activeElement);
    legend.hidden = !open;
    legendButton.setAttribute("aria-expanded", String(open));
    if (open) {
      setOptions(false);
      document.dispatchEvent(new CustomEvent("map-legend-opening"));
      byId("closeMapLegend").focus({ preventScroll: true });
    } else if (returnFocus || wasFocused) legendButton.focus({ preventScroll: true });
  }
  function syncMode() {
    const mobile = media.matches;
    const focusInOptions = options.contains(document.activeElement);
    setOptions(false);
    setLegend(false);
    document.body.dataset.mobile = String(mobile);
    for (const { field, slot, anchor } of fields) {
      if (mobile) slot.appendChild(field);
      else anchor.after(field);
    }
    // Preserve focus on a real visible control when rotating/resizing out of mobile mode.
    if (!mobile && (focusInOptions || document.activeElement === optionsButton)) {
      byId("themeSelector").focus({ preventScroll: true });
    }
  }
  optionsButton.addEventListener("click", () => setOptions(options.hidden));
  byId("closeMobileOptions").addEventListener("click", () => setOptions(false, true));
  byId("mobilePrivacyButton").addEventListener("click", () => {
    setOptions(false);
    byId("openWelcome").click();
  });
  legendButton.addEventListener("click", () => setLegend(legend.hidden));
  byId("closeMapLegend").addEventListener("click", () => setLegend(false, true));
  document.addEventListener("click", event => {
    if (!options.hidden && !options.contains(event.target) && !optionsButton.contains(event.target)) setOptions(false);
    if (!legend.hidden && !legend.contains(event.target) && !legendButton.contains(event.target)) setLegend(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape" || byId("welcomeDialog")?.open) return;
    if (options.hidden && legend.hidden) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!options.hidden) setOptions(false, true);
    else setLegend(false, true);
  }, true);
  document.addEventListener("site-section-change", () => {
    setOptions(false);
    setLegend(false);
  });
  media.addEventListener("change", syncMode);
  window.AtlasMobileUI = Object.freeze({
    isMobile: () => media.matches,
    closeLegend: () => setLegend(false),
    onPlaybackChanged(active) {
      if (active && !playing) setLegend(false);
      playing = active;
    },
    setLegendTypes(types) {
      const list = byId("mapLegendTypes");
      list.replaceChildren();
      for (const type of types) {
        const item = document.createElement("li");
        const swatch = document.createElement("span");
        swatch.className = "type-swatch";
        swatch.style.background = type.color;
        swatch.setAttribute("aria-hidden", "true");
        const name = document.createElement("span");
        name.textContent = type.name;
        item.append(swatch, name);
        list.appendChild(item);
      }
    },
  });
  syncMode();
})();
