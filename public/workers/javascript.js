self.onmessage = async ({ data }) => {
  const logs = [];
  const format = value => typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? String(value);
  const logger = (...items) => {
    if (logs.length < 100) logs.push(items.map(format).join(' ').slice(0, 4000));
  };
  try {
    const run = new Function('console', '"use strict";\n' + data.code);
    const result = await run({ log: logger, info: logger, warn: logger, error: logger, table: logger });
    if (result !== undefined) logger(result);
    self.postMessage({ type: 'result', text: logs.join('\n') || 'Keyrslu lokið. Notaðu console.log() til að birta niðurstöðu.' });
  } catch (error) { self.postMessage({ type: 'error', text: error.message }); }
};
