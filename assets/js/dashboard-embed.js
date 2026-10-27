(() => {
  const frame = document.getElementById("analogosFrame");
  if (!frame) return;
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    if (event.data?.source !== "desastres-temporais-analogos") return;
    const height = Number(event.data.height);
    if (Number.isFinite(height) && height >= 400 && height <= 5000) {
      frame.style.height = `${height}px`;
    }
  });
})();
