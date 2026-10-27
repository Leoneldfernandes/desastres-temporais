const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createIdleController } = require('../assets/js/playback-view.js');
const { layoutUrl } = require('../assets/js/layout-shortcuts.js');
function clock() {
  let now = 0, serial = 0;
  const pending = new Map(), events = [];
  const idle = createIdleController({
    setTimer(fn, delay) { const id = ++serial; pending.set(id, { fn, at: now + delay }); return id; },
    clearTimer(id) { pending.delete(id); },
    hide() { events.push('hide'); }, show() { events.push('show'); },
  });
  return { idle, events, tick(ms) { now += ms; for (const [id, t] of [...pending]) if (t.at <= now) { pending.delete(id); t.fn(); } } };
}
test('monthly updates do not postpone hiding after five seconds', () => {
  const c = clock(); c.idle.update(true, false); c.tick(4000);
  c.idle.update(true, false); c.tick(999); assert.deepEqual(c.events, []);
  c.tick(1); assert.deepEqual(c.events, ['hide']);
});
test('pausing, leaving fullscreen or entering an expanded chart restores controls', () => {
  for (const reason of ['pause', 'exit', 'chart']) {
    const c = clock(); c.idle.update(true, false); c.tick(5000);
    c.idle.update(false, false); c.tick(10000);
    assert.deepEqual(c.events, ['hide', 'show'], reason);
  }
});
test('active selection and keyboard focus prevent hiding until interaction ends', () => {
  const c = clock(); c.idle.update(true, false); c.tick(4000);
  c.idle.update(true, true); c.tick(9000); assert.deepEqual(c.events, []);
  c.idle.update(true, false); c.tick(4999); assert.deepEqual(c.events, []);
  c.tick(1); assert.deepEqual(c.events, ['hide']);
});
test('explicit recovery gives a fresh interval and reset cancels it', () => {
  const c = clock(); c.idle.update(true, false); c.tick(5000);
  c.idle.interact(); c.tick(4999); assert.deepEqual(c.events, ['hide', 'show']);
  c.idle.reset(); c.tick(10000); assert.deepEqual(c.events, ['hide', 'show']);
});
test('layout links retain every view parameter and replace only layout and section', () => {
  const input = 'https://example.org/mapa/?mes=2025-11&uf=SC&tipos=6&localizar=4205407&historico=4205407&grafico=fechado&layout=compacto#sobre';
  for (const layout of ['amplo', 'compacto', 'intermediario']) {
    const before = new URL(input), after = new URL(layoutUrl(input, layout));
    assert.equal(after.hash, '#mapa'); assert.equal(after.searchParams.get('layout'), layout === 'amplo' ? null : layout);
    for (const [key, value] of before.searchParams) if (key !== 'layout') assert.equal(after.searchParams.get(key), value);
    assert.equal(after.origin, before.origin); assert.equal(after.pathname, before.pathname);
  }
  assert.throws(() => layoutUrl(input, 'unknown'));
});
test('scale moves only when its baseline intersects the player, independent of screen type', () => {
  const src = fs.readFileSync(require.resolve('../assets/js/app.js'), 'utf8');
  const fn = src.slice(src.indexOf('function scaleOverlapOffset('), src.indexOf('\nfunction syncMapScaleOffset('));
  const context = vm.createContext({}); vm.runInContext(fn, context);
  const player = { left: 17, right: 751, top: 886, bottom: 1005 };
  const scale = { width: 64, left: 703, right: 767, top: 984, bottom: 1002 };
  assert.equal(context.scaleOverlapOffset(1024, player, scale), 150);
  assert.equal(context.scaleOverlapOffset(1024, player, { ...scale, left: 760 }), 0);
  assert.equal(context.scaleOverlapOffset(1024, player, { ...scale, top: 850, bottom: 870 }), 0);
  assert.equal(context.scaleOverlapOffset(1024, player, { ...scale, width: 0 }), 0);
});

test('discreet links wrap only the three requested letters and preserve the paragraph', () => {
  const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
  const fragment = html.split('<h3>Como interpretar</h3>')[1].match(/<p>(.*?)<\/p>/s)[1];
  assert.equal(fragment.replace(/<[^>]+>/g, ''), 'O mês corresponde à data do evento registrada na fonte. Ausência de registro não significa ausência de desastre. Os valores refletem os danos declarados e podem apresentar limitações ou receber correções.');
  const letters = [...fragment.matchAll(/data-layout-shortcut="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(letters, [['amplo', 'A'], ['intermediario', 'l'], ['compacto', 'c']]);
  assert.equal(html.includes('id="aboutLayoutTrigger"'), false);
});
