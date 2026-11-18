let runtime;
let canvasGame;

self.onmessage = async ({ data }) => {
  const logs = [];
  try {
    if (data.type === 'input') {
      canvasGame?.handle_event(data.event);
      return;
    }
    if (data.type && data.type !== 'run') return;

    if (!runtime) {
      self.postMessage({ type: 'loading', text: 'Sæki Python-vélina… Fyrsta keyrsla getur tekið smástund.' });
      const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs');
      runtime = await loadPyodide();
    }
    runtime.setStdout({ batched: text => { if (logs.length < 200) logs.push(text.slice(0, 2000)); } });
    runtime.setStderr({ batched: text => { if (logs.length < 200) logs.push(text.slice(0, 2000)); } });
    self.postMessage({ type: 'ready' });

    const globals = runtime.toPy(data.canvas ? { __name__: '__playground__' } : {});
    let result;
    try {
      result = await runtime.runPythonAsync(data.code, { globals });
      if (!data.canvas) {
        if (result !== undefined && result !== null) logs.push(String(result));
        self.postMessage({ type: 'result', text: logs.join('\n') || 'Keyrslu lokið án úttaks.' });
        return;
      }

      const start = globals.get('start_playground');
      try {
        if (typeof start !== 'function') throw new Error('Python-forritið þarf start_playground fall.');
        canvasGame = start(
          data.canvas,
          data.width,
          data.height,
          data.saved ?? '',
          text => self.postMessage({ type: 'canvas-save', text }),
          paused => self.postMessage({ type: 'canvas-state', paused }),
        );
        if (typeof canvasGame?.handle_event !== 'function') {
          canvasGame?.destroy?.();
          canvasGame = undefined;
          throw new Error('Leikurinn þarf að skila hlut með handle_event aðferð.');
        }
        self.postMessage({ type: 'canvas-ready' });
      } finally { start?.destroy?.(); }
    } finally {
      result?.destroy?.();
      globals.destroy();
    }
  } catch (error) { self.postMessage({ type: 'error', text: String(error.message ?? error).slice(-4000) }); }
};
