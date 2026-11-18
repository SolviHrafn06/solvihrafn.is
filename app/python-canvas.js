const saveKey = 'silt-and-spruce-v1';
const playKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'Space', 'ShiftLeft', 'ShiftRight',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6',
]);

export function isCanvasSource(source) {
  return /^(?:[^\S\r\n]*\r?\n)*# playground: canvas(?:\r?\n|$)/.test(source);
}

export function attachPythonCanvas(host, worker) {
  const view = document.createElement('canvas');
  if (!view.transferControlToOffscreen) {
    throw new Error('Þessi vafri styður ekki OffscreenCanvas.');
  }
  view.tabIndex = 0;
  view.setAttribute('aria-label', 'Leikjaskjár Python. Ýttu á Enter til að byrja.');
  Object.assign(view.style, { display: 'block', width: '100%', height: '100%', cursor: 'crosshair', outlineOffset: '-2px' });

  const pane = host.parentElement;
  let width = Math.max(1, pane.clientWidth);
  let height = Math.max(1, pane.clientHeight);
  view.width = width;
  view.height = height;
  const canvas = view.transferControlToOffscreen();
  host.appendChild(view);

  const listeners = new AbortController();
  const { signal } = listeners;
  const input = (kind, fields) => worker.postMessage({ type: 'input', event: { kind, ...fields } });
  let paused = true;
  let dragged = false;

  function lockPointer() {
    try {
      view.requestPointerLock?.()?.catch(() => {});
    } catch {
      // Arrow keys and middle-button drag still work when pointer lock is unavailable.
    }
  }

  function releasePointer() {
    if (document.pointerLockElement === view) document.exitPointerLock();
  }

  function pause() {
    dragged = false;
    input('pause');
    releasePointer();
  }

  view.addEventListener('mousedown', event => {
    view.focus({ preventScroll: true });
    event.preventDefault();
    if (paused && event.button === 0) lockPointer();
    if (event.button === 1) dragged = true;
    input('mouseDown', { button: event.button });
  }, { signal });
  document.addEventListener('mouseup', event => {
    if (dragged || event.target === view || document.pointerLockElement === view) {
      input('mouseUp', { button: event.button });
    }
    if (event.button === 1) dragged = false;
  }, { signal });
  document.addEventListener('mousemove', event => {
    if (!paused && (dragged || document.pointerLockElement === view)) {
      input('mouseMove', { movementX: event.movementX, movementY: event.movementY });
    }
  }, { signal });
  document.addEventListener('pointerlockchange', () => {
    input('lock', { locked: document.pointerLockElement === view });
  }, { signal });
  view.addEventListener('contextmenu', event => event.preventDefault(), { signal });
  view.addEventListener('wheel', event => {
    if (paused) return;
    event.preventDefault();
    input('wheel', { deltaY: event.deltaY });
  }, { passive: false, signal });

  function key(kind, event) {
    const { code, repeat, ctrlKey, metaKey, altKey } = event;
    if (kind === 'keyDown' && paused && code === 'Enter' && !repeat && !ctrlKey && !metaKey && !altKey) {
      event.preventDefault();
      lockPointer();
      input('mouseDown', { button: 0 });
      return;
    }
    if (!paused && !ctrlKey && !metaKey && !altKey && playKeys.has(code)) event.preventDefault();
    input(kind, { code, repeat, ctrlKey, metaKey, altKey });
  }

  view.addEventListener('keydown', event => key('keyDown', event), { signal });
  view.addEventListener('keyup', event => key('keyUp', event), { signal });
  view.addEventListener('blur', pause, { signal });
  window.addEventListener('blur', pause, { signal });

  const observer = new ResizeObserver(() => {
    const nextWidth = pane.clientWidth, nextHeight = pane.clientHeight;
    if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return;
    width = nextWidth;
    height = nextHeight;
    input('resize', { width, height });
  });
  observer.observe(pane);

  return {
    run(code) {
      let saved = null;
      try { saved = localStorage.getItem(saveKey); } catch {}
      worker.postMessage({ type: 'run', code, canvas, width, height, saved }, [canvas]);
    },
    setPaused(value) {
      paused = value;
      if (paused) {
        dragged = false;
        releasePointer();
      }
    },
    save(text) {
      if (typeof text !== 'string') return;
      try { localStorage.setItem(saveKey, text); } catch {}
    },
    dispose() {
      observer.disconnect();
      listeners.abort();
      releasePointer();
      view.remove();
    },
  };
}
