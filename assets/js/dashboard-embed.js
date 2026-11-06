(() => {
  const frames = [
    { frame: document.getElementById("analogosFrame"), source: "desastres-temporais-analogos" },
    { frame: document.getElementById("simuladorFrame"), source: "desastres-temporais-simulador" },
  ].filter(item => item.frame);
  if (!frames.length) return;
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    const item = frames.find(item => event.source === item.frame.contentWindow && event.data?.source === item.source);
    if (!item) return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height >= 400 && height <= 6000) {
      item.frame.style.height = `${height}px`;
    }
  });
})();
