const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/welcome.js'), 'utf8');
const key = 'desastres-google-visit-choice-v2';

class Element {
  constructor() { this.handlers = {}; this.hidden = false; this.open = false; }
  addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
  emit(name, event = {}) { for (const fn of this.handlers[name] || []) fn(event); }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  focus() { this.focused = true; }
}

function setup(options = {}) {
  const storage = new Map(Object.entries(options.storage || {}));
  const ids = ['welcomeDialog', 'openWelcome', 'acceptVisit', 'declineVisit', 'continueWelcome', 'welcomeConsent', 'welcomeNoCounter', 'analyticsChoice', 'saveVisitChoice'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const document = new Element();
  document.getElementById = id => elements[id];
  document.dispatchEvent = event => document.emit(event.type, event);
  document.visibilityState = options.visibility || 'visible';
  document.prerendering = options.prerendering || false;
  const requests = [];
  const scripts = [];
  const cookies = new Map(Object.entries(options.cookies || {}));
  const cookieWrites = [];
  Object.defineProperty(document, 'cookie', {
    get: () => [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
    set: value => {
      cookieWrites.push(value);
      const [pair] = value.split(';');
      const [name, content] = pair.split('=');
      if (/max-age=0/.test(value)) cookies.delete(name);
      else cookies.set(name, content);
    },
  });
  document.createElement = () => new Element();
  document.head = { appendChild: script => { scripts.push(script); requests.push(script.src); } };
  const events = () => (window.dataLayer || []).map(args => [...args]);
  const loadTag = () => { if (scripts[0]) scripts[0].onload(); };

  const window = new Element();
  window.VISITOR_METRICS = options.config === undefined
    ? { measurementId: 'G-TEST123456', privacySettingsVerified: true }
    : options.config;
  window.location = { hostname: options.hostname || 'leoneldfernandes.github.io', origin: 'https://leoneldfernandes.github.io', pathname: options.pathname || '/desastres-temporais/' };
  window.navigator = { webdriver: options.webdriver || false };
  window.localStorage = {
    getItem: name => { if (options.brokenStorage) throw Error('unavailable'); return storage.get(name) || null; },
    setItem: (name, value) => { if (options.brokenStorage) throw Error('unavailable'); storage.set(name, value); },
  };
  vm.runInNewContext(source, { window, document, URL, AbortController, CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } } });
  return { elements, document, window, requests, storage, scripts, events, loadTag, cookies, cookieWrites };
}

test('no Google request before consent; accepted tag sends one sanitized pageview', () => {
  const s = setup();
  assert.equal(s.elements.welcomeDialog.open, true);
  assert.equal(s.elements.analyticsChoice.checked, false);
  assert.equal(s.requests.length, 0);
  s.elements.acceptVisit.emit('click');
  assert.equal(s.elements.welcomeDialog.open, false);
  assert.deepEqual(s.requests, ['https://www.googletagmanager.com/gtag/js?id=G-TEST123456']);
  assert.equal(s.scripts[0].referrerPolicy, 'no-referrer');
  assert.equal(s.events().some(x => x[0] === 'config'), false);
  s.loadTag();
  const events = s.events();
  const defaults = events.find(x => x[0] === 'consent' && x[1] === 'default');
  assert.equal(defaults[2].analytics_storage, 'denied');
  const config = events.find(x => x[0] === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.cookie_update, false);
  const views = events.filter(x => x[0] === 'event' && x[1] === 'page_view');
  assert.equal(views.length, 1);
  assert.equal(views[0][2].page_location, 'https://leoneldfernandes.github.io/desastres-temporais/');
  assert.equal(views[0][2].page_referrer, '');
  s.elements.openWelcome.emit('click');
  s.elements.acceptVisit.emit('click');
  s.document.emit('visibilitychange');
  assert.equal(s.events().filter(x => x[0] === 'event').length, 1);
  assert.equal(s.requests.length, 1);
});

test('refusing and Escape allow access without counting, including subsequent visits', () => {
  const s = setup();
  s.elements.declineVisit.emit('click');
  assert.equal(s.requests.length, 0);
  const next = setup({ storage: Object.fromEntries(s.storage) });
  assert.equal(next.elements.welcomeDialog.open, false);
  assert.equal(next.requests.length, 0);
  const escaped = setup();
  let prevented = false;
  escaped.elements.welcomeDialog.emit('cancel', { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(escaped.requests.length, 0);
  assert.equal(escaped.elements.welcomeDialog.open, false);
  assert.equal(JSON.parse(escaped.storage.get(key)).value, 'declined');
});

test('a returning accepted visitor counts once without a repeated popup', () => {
  const storage = { [key]: JSON.stringify({ value: 'accepted', at: Date.now() }), 'desastres-welcome-seen-v1': 'yes' };
  const s = setup({ storage });
  assert.equal(s.elements.welcomeDialog.open, false);
  assert.equal(s.requests.length, 1);
});

test('revocation before tag loading prevents configuration and a pageview', () => {
  const s = setup();
  s.elements.acceptVisit.emit('click');
  s.elements.openWelcome.emit('click');
  s.elements.declineVisit.emit('click');
  s.loadTag();
  assert.equal(s.window['ga-disable-G-TEST123456'], true);
  assert.equal(s.events().some(x => x[0] === 'config' || x[0] === 'event'), false);
  assert.equal(JSON.parse(s.storage.get(key)).value, 'declined');
});

test('revoking a loaded tag blocks measurement and reaccepting does not duplicate pageviews', () => {
  const s = setup();
  s.elements.acceptVisit.emit('click');
  s.loadTag();
  s.elements.openWelcome.emit('click');
  s.elements.declineVisit.emit('click');
  assert.equal(s.window['ga-disable-G-TEST123456'], true);
  s.elements.openWelcome.emit('click');
  s.elements.acceptVisit.emit('click');
  assert.equal(s.events().filter(x => x[0] === 'event').length, 1);
});

test('missing, invalid or unverified configuration never asks consent or sends data', () => {
  for (const config of [{}, { measurementId: 'G-TEST123456', privacySettingsVerified: false }, { measurementId: 'not-an-id', privacySettingsVerified: true }]) {
    const s = setup({ config });
    assert.equal(s.elements.welcomeConsent.hidden, true);
    assert.equal(s.elements.acceptVisit.hidden, true);
    assert.equal(s.elements.continueWelcome.hidden, false);
    s.elements.continueWelcome.emit('click');
    assert.equal(s.elements.welcomeDialog.open, false);
    assert.equal(s.requests.length, 0);
    assert.equal(s.storage.has(key), false);
  }
});

test('activating metrics after the informational popup requests a new decision', () => {
  const s = setup({ storage: { 'desastres-welcome-seen-v1': 'yes' } });
  assert.equal(s.elements.welcomeDialog.open, true);
  assert.equal(s.requests.length, 0);
});

test('expired, corrupt and future choices never silently authorize', () => {
  for (const value of ['not-json', JSON.stringify({ value: 'accepted', at: Date.now() - 181 * 86400000 }), JSON.stringify({ value: 'accepted', at: Date.now() + 86400000 })]) {
    const s = setup({ storage: { [key]: value } });
    assert.equal(s.elements.welcomeDialog.open, true);
    assert.equal(s.requests.length, 0);
  }
});

test('storage failure and a blocked Google tag never prevent continuing', async () => {
  const s = setup({ brokenStorage: true });
  s.elements.acceptVisit.emit('click');
  s.scripts[0].onerror();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(s.elements.welcomeDialog.open, false);
  assert.equal(s.requests.length, 1);
});

test('local, automated and hidden loads are not counted', () => {
  for (const options of [{ hostname: 'localhost' }, { webdriver: true }]) {
    const s = setup(options);
    s.elements.acceptVisit.emit('click');
    assert.equal(s.requests.length, 0);
  }
  const s = setup({ visibility: 'hidden', prerendering: true });
  s.elements.acceptVisit.emit('click');
  assert.equal(s.requests.length, 0);
  s.document.visibilityState = 'visible';
  s.document.prerendering = false;
  s.document.emit('prerenderingchange');
  assert.equal(s.requests.length, 1);
});

test('revocation in another tab blocks this tag; background shortcuts stop inside the dialog', () => {
  const s = setup();
  let stopped = false;
  s.document.emit('keydown', { stopPropagation: () => { stopped = true; } });
  assert.equal(stopped, true);
  s.elements.acceptVisit.emit('click');
  s.storage.set(key, JSON.stringify({ value: 'declined', at: Date.now() }));
  s.window.emit('storage', { key });
  assert.equal(s.window['ga-disable-G-TEST123456'], true);
  s.document.emit('visibilitychange');
  assert.equal(s.requests.length, 1);
});


test('Save selection respects the initially off switch and a deliberate opt-in', () => {
  const s = setup();
  s.elements.saveVisitChoice.emit('click');
  assert.equal(s.requests.length, 0);
  assert.equal(JSON.parse(s.storage.get(key)).value, 'declined');
  s.elements.openWelcome.emit('click');
  s.elements.analyticsChoice.checked = true;
  s.elements.saveVisitChoice.emit('click');
  s.loadTag();
  assert.equal(s.events().filter(x => x[0] === 'event').length, 1);
});

test('a previous GoatCounter authorization is not reused for Google Analytics', () => {
  const s = setup({ storage: { 'desastres-visit-choice-v1': JSON.stringify({ value: 'accepted', at: Date.now() }), 'desastres-welcome-seen-v1': 'yes' } });
  assert.equal(s.elements.welcomeDialog.open, true);
  assert.equal(s.elements.analyticsChoice.checked, false);
  assert.equal(s.requests.length, 0);
});


test('revoking removes this project cookies and preserves unrelated cookies', () => {
  const s = setup({ cookies: { dnb_ga: 'visitor', dnb_ga_TEST123456: 'session', _ga: 'other-project', preference: 'keep' } });
  s.elements.acceptVisit.emit('click');
  s.loadTag();
  s.elements.openWelcome.emit('click');
  s.elements.declineVisit.emit('click');
  assert.deepEqual(Object.fromEntries(s.cookies), { _ga: 'other-project', preference: 'keep' });
  assert.equal(s.cookieWrites.length, 6);
  assert.ok(s.cookieWrites.every(value => value.includes('max-age=0; path=/')));
});

test('renamed publication reports its actual URL without filters', () => {
  const s = setup({ pathname: '/desastres-no-brasil/' });
  s.elements.acceptVisit.emit('click');
  s.loadTag();
  assert.equal(s.events().find(x => x[0] === 'event')[2].page_location, 'https://leoneldfernandes.github.io/desastres-no-brasil/');
});
