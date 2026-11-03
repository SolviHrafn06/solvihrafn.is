import { mkdir, copyFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve('sql.js/dist/sql-wasm-browser.js'));
await mkdir('public/vendor', { recursive: true });
for (const file of ['sql-wasm-browser.js', 'sql-wasm-browser.wasm']) {
  await copyFile(path.join(dist, file), path.join('public/vendor', file));
}
await copyFile(path.join(dist, '..', 'LICENSE'), 'public/vendor/sql-js-LICENSE.txt');
