let runtime;
self.onmessage = async ({ data }) => {
  const logs = [];
  try {
    if (!runtime) {
      self.postMessage({ type: 'loading', text: 'Sæki Python-vélina… Fyrsta keyrsla getur tekið smástund.' });
      const { loadPyodide } = await import('https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs');
      runtime = await loadPyodide();
    }
    runtime.setStdout({ batched: text => { if (logs.length < 200) logs.push(text.slice(0, 2000)); } });
    runtime.setStderr({ batched: text => { if (logs.length < 200) logs.push(text.slice(0, 2000)); } });
    self.postMessage({ type: 'ready' });
    const globals = runtime.toPy({});
    try {
      const result = await runtime.runPythonAsync(data.code, { globals });
      if (result !== undefined && result !== null) { logs.push(String(result)); result.destroy?.(); }
      self.postMessage({ type: 'result', text: logs.join('\n') || 'Keyrslu lokið án úttaks.' });
    } finally { globals.destroy(); }
  } catch (error) { self.postMessage({ type: 'error', text: error.message.slice(-4000) }); }
};
