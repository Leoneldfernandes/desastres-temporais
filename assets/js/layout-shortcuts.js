/* Discreet layout links in the interpretation paragraph; not access control. */
(() => {
  'use strict';
  function layoutUrl(href, layout) {
    const url = new URL(href);
    if (!['amplo', 'intermediario', 'compacto'].includes(layout)) throw new Error('Unknown layout');
    if (layout === 'amplo') url.searchParams.delete('layout');
    else url.searchParams.set('layout', layout);
    url.hash = 'mapa';
    return url.href;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { layoutUrl };
  if (typeof document === 'undefined') return;
  const links = document.querySelectorAll('#section-sobre [data-layout-shortcut]');
  const syncLinks = () => links.forEach(link => {
    link.href = layoutUrl(window.location.href, link.dataset.layoutShortcut);
  });
  // Native anchors preserve ordinary click, keyboard, copy-link and new-tab actions.
  links.forEach(link => link.addEventListener('click', syncLinks));
  document.addEventListener('site-section-change', syncLinks);
  window.addEventListener('pageshow', syncLinks);
  window.addEventListener('popstate', syncLinks);
  window.addEventListener('hashchange', syncLinks);
  syncLinks();
})();
