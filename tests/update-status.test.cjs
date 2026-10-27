const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const app = fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8');
const source = app.slice(app.indexOf('function setUpdateStatusPanel('), app.indexOf('function showFatalError('));
const oldDate = '2026-10-01T11:00:00+00:00';
const newDate = '2026-10-05T19:27:58+00:00';
const status = checkedAt => ({schemaVersion: 1, status: 'up-to-date', checkedAt});

function setup(fetchResult) {
  const calls = [], renders = [], attrs = {};
  const state = {updateStatus: status(oldDate), updateStatusRefreshing: false};
  let hidden = true;
  const dom = {
    dataStatus: {disabled: false, setAttribute: (key, value) => { attrs[key] = value; }, focus() {}},
    updateStatusPanel: {classList: {toggle: (_, value) => { hidden = value; }}},
  };
  const context = vm.createContext({state, dom, URL, Date,
    UPDATE_STATUS_URL: 'https://raw.githubusercontent.com/Leoneldfernandes/desastres-no-brasil/atlas-status/data/update-status.json',
    UPDATE_STATES: new Set(['up-to-date', 'update-available', 'awaiting-first-check', 'check-failed']),
    console: {warn() {}},
    fetchJson: async (url, cache) => { calls.push({url, cache}); return fetchResult(); },
    renderUpdateStatus: () => { renders.push({...state.updateStatus}); },
  });
  vm.runInContext(source, context);
  return {state, calls, renders, attrs,
    open: () => context.setUpdateStatusPanel(true),
    close: () => context.setUpdateStatusPanel(false),
    refresh: () => context.refreshUpdateStatus(),
    hidden: () => hidden,
  };
}

test('opening the menu retrieves the latest result without refreshing the map', async () => {
  const s = setup(async () => status(newDate));
  s.open();
  assert.equal(s.hidden(), false);
  await new Promise(setImmediate);
  assert.equal(s.state.updateStatus.checkedAt, newDate);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].cache, 'no-store');
  assert.equal(s.renders.length, 1);
  s.close();
  assert.equal(s.calls.length, 1);
});

test('rapid reopen shares the pending request and completion does not reopen the menu', async () => {
  let resolve;
  const s = setup(() => new Promise(done => { resolve = done; }));
  s.open(); s.close(); s.open(); s.close();
  assert.equal(s.calls.length, 1);
  resolve(status(newDate));
  await new Promise(setImmediate);
  assert.equal(s.hidden(), true);
  assert.equal(s.state.updateStatus.checkedAt, newDate);
  assert.equal(s.state.updateStatusRefreshing, false);
});

test('connection failure retains the last known date and allows another attempt', async () => {
  let fail = true;
  const s = setup(async () => { if (fail) throw Error('offline'); return status(newDate); });
  await s.refresh();
  assert.equal(s.state.updateStatus.status, 'check-failed');
  assert.equal(s.state.updateStatus.checkedAt, oldDate);
  assert.equal(s.state.updateStatusRefreshing, false);
  fail = false;
  await s.refresh();
  assert.equal(s.state.updateStatus.status, 'up-to-date');
  assert.equal(s.state.updateStatus.checkedAt, newDate);
});

test('invalid remote data is not shown as a successful verification', async () => {
  const s = setup(async () => status('invalid-date'));
  await s.refresh();
  assert.equal(s.state.updateStatus.status, 'check-failed');
  assert.equal(s.state.updateStatus.checkedAt, oldDate);
});
