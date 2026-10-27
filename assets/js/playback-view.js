/* Optional mobile fullscreen controls; no map gestures are intercepted. */
(() => {
  'use strict';
  function createIdleController({ hide, show, setTimer = setTimeout, clearTimer = clearTimeout, delay = 5000 }) {
    let timer = null, eligible = false, busy = false, hidden = false;
    const cancel = () => { if (timer !== null) clearTimer(timer); timer = null; };
    const reveal = () => { if (hidden) { hidden = false; show(); } };
    function arm() {
      if (!eligible || busy || hidden || timer !== null) return;
      timer = setTimer(() => { timer = null; if (eligible && !busy) { hidden = true; hide(); } }, delay);
    }
    return {
      update(nextEligible, nextBusy) {
        eligible = nextEligible; busy = nextBusy;
        if (!eligible || busy) { cancel(); reveal(); } else arm();
      },
      interact() { cancel(); reveal(); arm(); },
      reset() { eligible = false; cancel(); reveal(); },
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createIdleController };
  if (typeof document === 'undefined') return;
  const byId = id => document.getElementById(id);
  const stage = byId('mapStage'), timeline = byId('timelinePanel');
  if (!stage || !timeline) return;
  const media = window.matchMedia('(max-width: 760px), (max-width: 1000px) and (max-height: 500px)');
  const invitation = byId('fullscreenInvitation'), dock = byId('playbackDock'), exit = byId('exitMobileFullscreen');
  let model = {}, bridge, keyboard = false, pressed = false;
  let offered = false;
  try { offered = sessionStorage.getItem('desastres-fullscreen-invite-v1') === 'seen'; } catch (_) { /* Functional storage is optional. */ }
  const areas = () => [timeline, stage.querySelector('.map-tools'), stage.querySelector('.leaflet-top'), stage.querySelector('.north-indicator')].filter(Boolean);
  function setHidden(hidden) {
    if (stage.classList.contains('playback-controls-hidden') === hidden) return;
    dock.hidden = !hidden;
    if (!hidden && dock.contains(document.activeElement)) byId('playButton').focus({ preventScroll: true });
    if (hidden && areas().some(el => el.contains(document.activeElement))) byId('dockPause').focus({ preventScroll: true });
    stage.classList.toggle('playback-controls-hidden', hidden);
    for (const el of areas()) el.inert = hidden;
    document.dispatchEvent(new CustomEvent('map-controls-visibility-change'));
  }
  const idle = createIdleController({ hide: () => setHidden(true), show: () => setHidden(false) });
  const controlArea = target => areas().some(el => el.contains(target)) || dock.contains(target) || exit.contains(target);
  function busy() {
    const activeInput = controlArea(document.activeElement)
      && document.activeElement?.matches('select, input, textarea');
    return pressed || activeInput || (keyboard && controlArea(document.activeElement))
      || Boolean(stage.querySelector('.leaflet-control-layers-expanded'))
      || !byId('municipalitySearchPanel').hidden || !byId('mapLegendPanel').hidden
      || byId('welcomeDialog').open || !byId('detailModal').classList.contains('is-hidden')
      || !byId('exportModal').classList.contains('is-hidden');
  }
  function refresh() {
    const fullscreen = media.matches && model.fullscreen;
    const eligible = fullscreen && model.playing && !model.expanded && !document.hidden;
    exit.hidden = !fullscreen;
    if (!media.matches || !model.playing || fullscreen) invitation.hidden = true;
    byId('dockMonth').textContent = model.month || '';
    idle.update(eligible, busy());
    if (!eligible) setHidden(false);
  }
  function showControls() {
    idle.interact();
    byId('playButton').focus({ preventScroll: true });
    refresh();
  }
  byId('dismissFullscreenInvitation').addEventListener('click', () => { invitation.hidden = true; });
  byId('acceptFullscreenInvitation').addEventListener('click', async () => {
    invitation.hidden = true;
    await bridge?.toggleFullscreen();
  });
  byId('dockControls').addEventListener('click', showControls);
  byId('dockPause').addEventListener('click', () => { bridge?.togglePlayback(); byId('playButton').focus({ preventScroll: true }); });
  exit.addEventListener('click', async () => { idle.reset(); await bridge?.toggleFullscreen(); byId('toggleFullscreen').focus({ preventScroll: true }); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') { keyboard = true; refresh(); }
  }, true);
  document.addEventListener('focusin', () => { if (keyboard) refresh(); });
  document.addEventListener('focusout', () => { queueMicrotask(refresh); });
  document.addEventListener('focusin', () => {
    if (controlArea(document.activeElement) && document.activeElement?.matches('select, input, textarea')) refresh();
  });
  stage.addEventListener('pointerdown', event => {
    keyboard = false;
    if (dock.contains(event.target) || exit.contains(event.target)) return;
    if (controlArea(event.target)) { pressed = true; idle.interact(); refresh(); }
  }, true);
  document.addEventListener('pointerup', () => { if (pressed) { pressed = false; idle.interact(); refresh(); } });
  document.addEventListener('pointercancel', () => { pressed = false; refresh(); });
  stage.addEventListener('input', () => { idle.interact(); refresh(); });
  stage.addEventListener('change', event => {
    if (!keyboard && event.target.matches('select')) event.target.blur();
    idle.interact(); refresh();
  });
  document.addEventListener('visibilitychange', refresh);
  document.addEventListener('site-section-change', () => { invitation.hidden = true; idle.reset(); });
  media.addEventListener('change', refresh);
  window.AtlasPlaybackView = Object.freeze({
    connect(callbacks) { bridge = callbacks; },
    update(next) { model = next; refresh(); },
    onPlayRequested() {
      if (!media.matches || model.fullscreen || offered) return;
      offered = true;
      try { sessionStorage.setItem('desastres-fullscreen-invite-v1', 'seen'); } catch (_) { /* No tracking. */ }
      invitation.hidden = false;
    },
  });
})();
