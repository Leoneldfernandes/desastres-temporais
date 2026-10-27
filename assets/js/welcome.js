(() => {
  "use strict";

  const dialog = document.getElementById("welcomeDialog");
  const openButton = document.getElementById("openWelcome");
  const acceptButton = document.getElementById("acceptVisit");
  const declineButton = document.getElementById("declineVisit");
  const continueButton = document.getElementById("continueWelcome");
  const consent = document.getElementById("welcomeConsent");
  const analyticsChoice = document.getElementById("analyticsChoice");
  const saveButton = document.getElementById("saveVisitChoice");
  const noCounter = document.getElementById("welcomeNoCounter");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const preferenceKey = "desastres-google-visit-choice-v2";
  const introKey = "desastres-welcome-seen-v1";
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const config = window.VISITOR_METRICS || {};
  // Closed by default: an unconfigured counter must not request consent or send requests.
  const measurementId = typeof config.measurementId === "string"
    && /^G-[A-Z0-9]+$/.test(config.measurementId)
    && config.privacySettingsVerified === true ? config.measurementId : "";
  const enabled = Boolean(measurementId);
  const disableKey = `ga-disable-${measurementId}`;
  let choice = readChoice();
  let tag = null;
  let tagReady = false;
  let configured = false;
  let pageViewSent = false;
  if (enabled) window[disableKey] = true;

  function read(key) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }

  function save(key, value) {
    try { window.localStorage.setItem(key, value); } catch { /* Current choice still works in memory. */ }
  }

  function readChoice() {
    try {
      const stored = JSON.parse(read(preferenceKey));
      if (!stored || !["accepted", "declined"].includes(stored.value)
          || !Number.isFinite(stored.at) || stored.at > Date.now()
          || Date.now() - stored.at >= lifetime) return null;
      return stored.value;
    } catch { return null; }
  }

  function countAccess() {
    if (!enabled || choice !== "accepted" || document.visibilityState !== "visible"
        || document.prerendering || window.navigator.webdriver
        || window.location.hostname !== "leoneldfernandes.github.io") return;
    if (!tag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", {
        analytics_storage: "denied", ad_storage: "denied",
        ad_user_data: "denied", ad_personalization: "denied",
      });
      tag = document.createElement("script");
      tag.async = true;
      tag.referrerPolicy = "no-referrer";
      tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      tag.onload = () => { tagReady = true; countAccess(); };
      tag.onerror = () => { /* Blocking Analytics never blocks the map. */ };
      document.head.appendChild(tag);
      return;
    }
    if (!tagReady) return;
    if (pageViewSent && window[disableKey] === false) return;
    window[disableKey] = false;
    window.gtag("consent", "update", {
      analytics_storage: "granted", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    // Report the published page without map filters, query or fragment.
    const page = {
      page_title: "Desastres no Brasil",
      page_location: window.location.origin + window.location.pathname,
      page_referrer: "",
    };
    if (!configured) {
      window.gtag("js", new Date());
      window.gtag("config", measurementId, {
        ...page, send_page_view: false,
        allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_prefix: "dnb", cookie_domain: "leoneldfernandes.github.io",
        cookie_path: "/", cookie_expires: 180 * 24 * 60 * 60, cookie_update: false,
      });
      configured = true;
    }
    if (!pageViewSent) {
      pageViewSent = true;
      window.gtag("event", "page_view", { ...page, send_to: measurementId });
    }
  }

  function stopAnalytics() {
    if (!enabled) return;
    window[disableKey] = true;
    if (window.gtag) window.gtag("consent", "update", {
      analytics_storage: "denied", ad_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied",
    });
    // Remove only this project's first-party Analytics cookies, not other sites' cookies.
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (!/^dnb_ga(?:_|$)/.test(name)) continue;
      for (const domain of ["", "; domain=leoneldfernandes.github.io", "; domain=.leoneldfernandes.github.io"]) {
        document.cookie = `${name}=; max-age=0; path=/${domain}; SameSite=Lax; Secure`;
      }
    }
  }

  function setChoice(value) {
    choice = value;
    save(preferenceKey, JSON.stringify({ value, at: Date.now() }));
    save(introKey, "yes");
    analyticsChoice.checked = value === "accepted";
    if (value === "declined") stopAnalytics();
    dialog.close();
    countAccess();
  }

  function openWelcome() {
    if (dialog.open) return;
    analyticsChoice.checked = choice === "accepted";
    dialog.showModal();
    document.dispatchEvent(new CustomEvent("welcome-dialog-change", { detail: { open: true } }));
    (enabled ? declineButton : continueButton).focus();
  }

  consent.hidden = !enabled;
  saveButton.hidden = !enabled;
  noCounter.hidden = enabled;
  acceptButton.hidden = !enabled;
  declineButton.hidden = !enabled;
  continueButton.hidden = enabled;
  openButton.hidden = false;
  openButton.addEventListener("click", openWelcome);
  acceptButton.addEventListener("click", () => setChoice("accepted"));
  declineButton.addEventListener("click", () => setChoice("declined"));
  saveButton.addEventListener("click", () => setChoice(analyticsChoice.checked ? "accepted" : "declined"));
  continueButton.addEventListener("click", () => {
    save(introKey, "yes");
    dialog.close();
  });
  // Escape is never consent. Opening the preferences doesn't erase a previous decision.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (enabled && !choice) setChoice("declined");
    else {
      save(introKey, "yes");
      dialog.close();
    }
  });
  // Capture prevents background map shortcuts while the modal is open.
  document.addEventListener("keydown", (event) => {
    if (dialog.open) event.stopPropagation();
  }, true);
  document.addEventListener("visibilitychange", countAccess);
  document.addEventListener("prerenderingchange", countAccess);
  window.addEventListener("storage", (event) => {
    if (event.key !== preferenceKey && event.key !== null) return;
    choice = readChoice();
    if (choice !== "accepted") stopAnalytics();
    analyticsChoice.checked = choice === "accepted";
    if (!choice) openWelcome();
  });
  dialog.addEventListener("close", () => {
    document.dispatchEvent(new CustomEvent("welcome-dialog-change", { detail: { open: false } }));
  });

  if ((enabled && !choice) || read(introKey) !== "yes") openWelcome();
  countAccess();
})();
