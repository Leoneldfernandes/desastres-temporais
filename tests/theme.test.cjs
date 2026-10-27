const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/theme.js'), 'utf8');
const key = 'desastres-color-theme-v1';
function setup({ saved, dark = false, brokenStorage = false } = {}) {
  const handlers = {};
  const windowHandlers = {};
  const system = { matches: dark, addEventListener: (_, fn) => { system.changed = fn; } };
  const label = { hidden: true };
  const select = { value: '', closest: () => label, addEventListener: (_, fn) => { select.change = fn; } };
  const meta = {};
  const document = {
    documentElement: { dataset: {} }, querySelector: () => meta,
    getElementById: () => select, addEventListener: (name, fn) => { handlers[name] = fn; },
  };
  const storage = new Map(saved === undefined ? [] : [[key, saved]]);
  const window = {
    matchMedia: () => system, addEventListener: (name, fn) => { windowHandlers[name] = fn; },
    localStorage: {
      getItem: name => { if (brokenStorage) throw Error(); return storage.get(name); },
      setItem: (name, value) => { if (brokenStorage) throw Error(); storage.set(name, value); },
    },
  };
  vm.runInNewContext(source, { window, document });
  const themeBeforeReady = document.documentElement.dataset.theme;
  handlers.DOMContentLoaded();
  return { document, select, label, storage, meta, themeBeforeReady,
    theme: () => document.documentElement.dataset.theme,
    choose: value => { select.value = value; select.change(); },
    os: value => { system.matches = value; system.changed(); },
    storageEvent: event => windowHandlers.storage(event),
  };
}
test('first render and live changes follow the system by default', () => {
  const s = setup();
  assert.equal(s.themeBeforeReady, 'light');
  assert.equal(s.select.value, 'system');
  assert.equal(s.label.hidden, false);
  s.os(true);
  assert.equal(s.theme(), 'dark');
  assert.equal(s.meta.content, '#07111f');
});
test('manual theme persists and ignores later OS changes', () => {
  const s = setup({ dark: true });
  s.choose('light');
  s.os(false); s.os(true);
  assert.equal(s.theme(), 'light');
  assert.equal(s.storage.get(key), 'light');
  assert.equal(setup({ saved: s.storage.get(key), dark: true }).themeBeforeReady, 'light');
  s.choose('system');
  assert.equal(s.theme(), 'dark');
  s.os(false);
  assert.equal(s.theme(), 'light');
});
test('dark override works on a light system; invalid saved choices fall back', () => {
  assert.equal(setup({ saved: 'dark' }).themeBeforeReady, 'dark');
  assert.equal(setup({ saved: 'unknown', dark: true }).themeBeforeReady, 'dark');
});
test('storage unavailable still allows changing appearance during the visit', () => {
  const s = setup({ brokenStorage: true });
  s.choose('dark');
  assert.equal(s.theme(), 'dark');
  s.choose('light');
  assert.equal(s.theme(), 'light');
  assert.equal(s.meta.content, '#f3f7fb');
});
test('other tabs synchronize the preference; unrelated storage stays separate', () => {
  const s = setup();
  s.storageEvent({ key, newValue: 'dark' });
  assert.equal(s.theme(), 'dark');
  assert.equal(s.select.value, 'dark');
  s.storageEvent({ key: 'desastres-google-visit-choice-v2', newValue: null });
  assert.equal(s.theme(), 'dark');
  s.storageEvent({ key: null, newValue: null });
  assert.equal(s.select.value, 'system');
  assert.equal(s.theme(), 'light');
});
