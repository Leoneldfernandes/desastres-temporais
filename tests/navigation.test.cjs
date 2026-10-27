const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/navigation.js'), 'utf8');

function setup(href = 'https://example.org/mapa/?mes=2023-10&uf=SC&tipos=1,8') {
  const elements = {};
  const events = [];
  const handlers = {};
  const buttons = [];
  const document = {
    activeElement: null,
    getElementById: id => elements[id],
    querySelectorAll: () => buttons,
    dispatchEvent: event => events.push(event.detail.section),
  };
  const element = id => elements[id] = {
    hidden: false, attrs: {}, handlers: {},
    addEventListener(name, fn) { this.handlers[name] = fn; },
    setAttribute(name, value) { this.attrs[name] = value; },
    focus() { document.activeElement = this; },
    contains(node) { return node === this; },
    click() { this.handlers.click?.(); },
  };
  element('siteNavigation');
  ['mapa', 'dashboard', 'sobre'].forEach(name => {
    element(`tab-${name}`); element(`section-${name}`);
  });
  buttons.push(element('return-map'));
  element('aboutPrivacy');
  let privacyOpened = false;
  element('openWelcome').handlers.click = () => { privacyOpened = true; };
  const location = {};
  const update = value => {
    const url = new URL(value, location.href || href);
    Object.assign(location, { href: url.href, hash: url.hash, search: url.search });
  };
  update(href);
  const history = [location.href];
  const window = {
    location,
    history: { pushState: (_, __, value) => { update(value); history.push(location.href); } },
    addEventListener: (name, fn) => { handlers[name] = fn; },
  };
  vm.runInNewContext(source, { document, window, URL, CustomEvent: class {
    constructor(name, options) { this.detail = options.detail; }
  } });
  return { elements, document, location, history, events,
    click: name => elements[`tab-${name}`].click(),
    restore: value => { update(value); handlers.popstate(); handlers.hashchange(); },
    key: (name, key) => { let prevented = false; elements[`tab-${name}`].handlers.keydown({key, preventDefault: () => { prevented = true; }}); return prevented; },
    privacy: () => privacyOpened,
  };
}

test('shared map URLs open the map and keep all visualization parameters', () => {
  const s = setup();
  assert.equal(s.elements['section-mapa'].hidden, false);
  assert.equal(s.elements['section-dashboard'].hidden, true);
  const query = s.location.search;
  s.click('dashboard'); s.click('sobre'); s.click('mapa');
  assert.equal(s.location.search, query);
  assert.equal(s.elements['tab-mapa'].attrs['aria-selected'], 'true');
  assert.deepEqual(s.events, ['mapa', 'dashboard', 'sobre', 'mapa']);
});
test('direct links and browser back restore sections without duplicate history or events', () => {
  const s = setup('https://example.org/mapa/?mes=2023-10#sobre');
  assert.equal(s.elements['section-sobre'].hidden, false);
  s.click('dashboard'); s.click('dashboard');
  assert.equal(s.history.length, 2);
  s.elements['tab-dashboard'].focus();
  s.restore(s.history[0]);
  assert.equal(s.elements['section-sobre'].hidden, false);
  assert.equal(s.elements['tab-dashboard'].tabIndex, -1);
  assert.equal(s.document.activeElement, s.elements['tab-sobre']);
  assert.deepEqual(s.events, ['sobre', 'dashboard', 'sobre']);
});
test('arrow keys wrap, Home and End select and focus the correct tabs', () => {
  const s = setup();
  assert.equal(s.key('mapa', 'ArrowLeft'), true);
  assert.equal(s.document.activeElement, s.elements['tab-sobre']);
  s.key('sobre', 'ArrowRight');
  assert.equal(s.document.activeElement, s.elements['tab-mapa']);
  s.key('mapa', 'End'); s.key('sobre', 'Home');
  assert.equal(s.document.activeElement, s.elements['tab-mapa']);
  assert.equal(s.key('mapa', 'ArrowDown'), false);
});
test('return buttons and privacy remain available from editorial sections', () => {
  const s = setup('https://example.org/mapa/#sobre');
  s.elements.aboutPrivacy.click();
  assert.equal(s.privacy(), true);
  s.elements['return-map'].click();
  assert.equal(s.elements['section-mapa'].hidden, false);
  assert.equal(s.document.activeElement, s.elements['tab-mapa']);
});
test('unknown fragments preserve legacy anchor URLs and default to the map', () => {
  const s = setup('https://example.org/mapa/?mes=2023-10#map');
  assert.equal(s.elements['section-mapa'].hidden, false);
  assert.equal(s.location.hash, '#map');
  assert.equal(s.history.length, 1);
});
