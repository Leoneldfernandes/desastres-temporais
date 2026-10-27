const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/mobile-ui.js'), 'utf8');

function harness(mobile = true) {
  const elements = new Map();
  const listeners = new Map();
  const document = {
    activeElement: null, body: { dataset: {} },
    getElementById: id => elements.get(id),
    querySelector: selector => elements.get(selector),
    createElement: () => element(), createComment: () => element(),
    addEventListener(type, listener) {
      const entries = listeners.get(type) || [];
      entries.push(listener); listeners.set(type, entries);
    },
    dispatchEvent(event) { for (const listener of listeners.get(event.type) || []) listener(event); },
  };
  function element(id) {
    const events = new Map();
    const item = {
      id, hidden: true, children: [], attributes: {}, style: {}, parentNode: null,
      setAttribute(name, value) { this.attributes[name] = value; },
      getAttribute(name) { return this.attributes[name]; },
      addEventListener(type, listener) { events.set(type, listener); },
      click() { events.get('click')?.({ target: this }); },
      focus() { document.activeElement = this; },
      contains(target) { return this === target || this.children.some(child => child.contains(target)); },
      appendChild(child) {
        if (child.parentNode) child.parentNode.children.splice(child.parentNode.children.indexOf(child), 1);
        child.parentNode = this; this.children.push(child); return child;
      },
      append(...children) { for (const child of children) this.appendChild(child); },
      replaceChildren() { for (const child of this.children) child.parentNode = null; this.children = []; },
      before(child) { this.parentNode.appendChild(child); },
      after(child) { this.parentNode.appendChild(child); },
    };
    if (id) elements.set(id, item);
    return item;
  }
  for (const id of ['mobileOptionsButton','mobileOptionsPanel','toggleMapLegend','mapLegendPanel',
    'mobileAppearanceSlot','mobileUpdatesSlot','closeMobileOptions','mobilePrivacyButton',
    'openWelcome','closeMapLegend','mapLegendTypes','dataStatus','closeUpdateStatus',
    'themeSelector','welcomeDialog','.field-theme','.update-status-wrap']) element(id);
  const header = element('header');
  header.append(elements.get('.field-theme'), elements.get('.update-status-wrap'));
  elements.get('.field-theme').appendChild(elements.get('themeSelector'));
  elements.get('mobileOptionsPanel').append(elements.get('mobileAppearanceSlot'), elements.get('mobileUpdatesSlot'), elements.get('closeMobileOptions'), elements.get('mobilePrivacyButton'));
  elements.get('mapLegendPanel').append(elements.get('closeMapLegend'), elements.get('mapLegendTypes'));
  elements.get('.update-status-wrap').append(elements.get('dataStatus'), elements.get('closeUpdateStatus'));
  elements.get('dataStatus').setAttribute('aria-expanded','false');
  elements.get('closeUpdateStatus').addEventListener('click', () => elements.get('dataStatus').setAttribute('aria-expanded','false'));
  let mediaChange;
  const media = { matches: mobile, addEventListener(type, listener) { mediaChange = listener; } };
  const window = { matchMedia: () => media };
  vm.runInNewContext(source, { window, document, CustomEvent: class { constructor(type) { this.type = type; } } });
  return { document, window, elements, header, media, rotate(value) { media.matches = value; mediaChange(); } };
}

test('rotation reuses controls, preserving selection and listeners without duplicate fields', () => {
  const h = harness(false), theme = h.elements.get('themeSelector');
  let changes = 0;
  theme.value = 'light'; theme.addEventListener('click', () => changes++);
  h.rotate(true);
  assert.equal(h.document.body.dataset.mobile, 'true');
  assert.equal(h.elements.get('.field-theme').parentNode, h.elements.get('mobileAppearanceSlot'));
  theme.click(); assert.equal(changes, 1); assert.equal(theme.value, 'light');
  h.elements.get('mobileOptionsButton').click(); theme.focus();
  h.rotate(false);
  assert.equal(h.elements.get('.field-theme').parentNode, h.header);
  assert.equal(h.elements.get('.update-status-wrap').parentNode, h.header);
  assert.equal(theme.value, 'light'); assert.equal(h.document.activeElement, theme);
  assert.equal(h.elements.get('mobileOptionsPanel').hidden, true);
});

test('options exposes the existing consent dialog and closes expanded update information', () => {
  const h = harness(); let opened = 0;
  h.elements.get('openWelcome').addEventListener('click', () => opened++);
  h.elements.get('mobileOptionsButton').click();
  h.elements.get('dataStatus').setAttribute('aria-expanded','true');
  h.elements.get('mobilePrivacyButton').click();
  assert.equal(opened, 1);
  assert.equal(h.elements.get('mobileOptionsPanel').hidden, true);
  assert.equal(h.elements.get('dataStatus').getAttribute('aria-expanded'), 'false');
});

test('legend uses every manifest color/name, even when filters select fewer types', () => {
  const h = harness();
  const types = Array.from({length: 16}, (_, id) => ({id, name: `Tipologia ${id}`, color: `#${id.toString(16).padStart(6,'0')}`}));
  h.window.AtlasMobileUI.setLegendTypes(types);
  const rows = h.elements.get('mapLegendTypes').children;
  assert.equal(rows.length, 16);
  rows.forEach((row, i) => {
    assert.equal(row.children[0].style.background, types[i].color);
    assert.equal(row.children[1].textContent, types[i].name);
  });
  h.window.AtlasMobileUI.setLegendTypes(types);
  assert.equal(h.elements.get('mapLegendTypes').children.length, 16);
});

test('playback closes legend once but allows consulting it during subsequent months', () => {
  const h = harness(); h.elements.get('toggleMapLegend').click();
  h.window.AtlasMobileUI.onPlaybackChanged(true);
  assert.equal(h.elements.get('mapLegendPanel').hidden, true);
  h.elements.get('toggleMapLegend').click();
  h.window.AtlasMobileUI.onPlaybackChanged(true);
  assert.equal(h.elements.get('mapLegendPanel').hidden, false);
  h.window.AtlasMobileUI.onPlaybackChanged(false);
  h.window.AtlasMobileUI.onPlaybackChanged(true);
  assert.equal(h.elements.get('mapLegendPanel').hidden, true);
});

test('Escape closes the open overlay and returns focus, without consuming consent Escape', () => {
  const h = harness(); h.elements.get('toggleMapLegend').click();
  let stopped = false;
  const event = {type:'keydown',key:'Escape',preventDefault(){},stopImmediatePropagation(){stopped=true;}};
  h.document.dispatchEvent(event);
  assert.equal(stopped,true);
  assert.equal(h.document.activeElement,h.elements.get('toggleMapLegend'));
  h.elements.get('mobileOptionsButton').click(); h.elements.get('welcomeDialog').open = true;
  h.document.dispatchEvent(event);
  assert.equal(h.elements.get('mobileOptionsPanel').hidden,false);
});

test('mouse opacity override is gated by genuine hover and a fine pointer', () => {
  const css = fs.readFileSync(path.join(__dirname,'../assets/css/app.css'),'utf8');
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.timeline\.is-playing:hover::before\s*\{ opacity: 1; \}\s*\}/);
  assert.equal((css.match(/\.timeline\.is-playing:hover::before/g) || []).length, 1);
  assert.match(css,/\.timeline\.is-playing::before \{ opacity: 0\.5; \}/);
  assert.match(css,/\.timeline\.is-playing:has\(:focus-visible\)::before \{ opacity: 1; \}/);
});
