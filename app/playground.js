'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { marked } from 'marked';
import { useExperience } from './experience';
import { languages, defaults, javaSource, csharpSource, cppSource } from './lab-data';
import { ROWS, COLS, initialWalls, findPath, jumpMetrics, steeringMetrics } from './lab-math.mjs';

const frameStyle = `*{box-sizing:border-box}body{margin:0;padding:28px;font:15px/1.7 system-ui,sans-serif;background:#f4f1e9;color:#242720;overflow-wrap:anywhere}h1{font-size:32px;line-height:1.15;letter-spacing:-1px}h2{font-size:22px}a{color:#8e371a;text-underline-offset:4px}pre{background:#242720;color:#f4f1e9;padding:18px;border-radius:8px;overflow:auto;font-size:12px}.game-card{background:#fffdf7;border:1px solid #d7d7ca;padding:26px;border-radius:16px;box-shadow:8px 8px 0 #ee754c}.tag{font-size:10px;letter-spacing:1.5px;color:#686a60}.game-card a{display:inline-block;margin-top:10px;border-radius:6px;background:#242720;color:#fff;padding:10px 16px;text-decoration:none}blockquote{border-left:3px solid #ee754c;margin-left:0;padding-left:16px}table{border-collapse:collapse}td,th{padding:6px 12px;border:1px solid #d7d7ca}`;
function frameDocument(content, css = '', reduced = false) {
  return `<!doctype html><html lang="is"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><base target="_blank"><style>${frameStyle}\n${css}\n@media(prefers-reduced-motion:reduce){*{animation:none!important}}${reduced ? '*{animation:none!important;transition:none!important}' : ''}</style></head><body>${content}</body></html>`;
}

function Range({ label, value, min, max, onChange, unit = '' }) {
  return <label className="demo-range"><span>{label}<output>{value}{unit}</output></span><input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} /></label>;
}

export function Playground() {
  const [selected, setSelected] = useState('javascript');
  const [sources, setSources] = useState(defaults);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [walls, setWalls] = useState(initialWalls);
  const [search, setSearch] = useState(null);
  const [power, setPower] = useState(10), [gravity, setGravity] = useState(10);
  const [targetX, setTargetX] = useState(280), [targetY, setTargetY] = useState(60), [speed, setSpeed] = useState(100);
  const [run, setRun] = useState(0);
  const workerRef = useRef(null), timerRef = useRef(null), workerKind = useRef(null);
  const { reduced } = useExperience();
  const current = languages.find(item => item.id === selected);
  const source = selected === 'java' ? javaSource(walls) : selected === 'csharp' ? csharpSource(power, gravity) : selected === 'cpp' ? cppSource(targetX, targetY, speed) : sources[selected];
  const previewSource = source;
  const jump = jumpMetrics(power, gravity), steering = steeringMetrics(targetX, targetY, speed);
  useEffect(() => {
    function fromRibbon(event) {
      if (languages.some(item => item.id === event.detail)) select(event.detail);
    }
    window.addEventListener('lab:select', fromRibbon);
    return () => { workerRef.current?.terminate(); clearTimeout(timerRef.current); window.removeEventListener('lab:select', fromRibbon); };
  }, []);

  function stop() {
    workerRef.current?.terminate(); workerRef.current = null; workerKind.current = null;
    clearTimeout(timerRef.current); setBusy(false);
  }
  function select(id) { stop(); setSelected(id); setResult(null); setStatus(''); setSearch(null); setRun(0); }
  function reset() {
    stop(); setResult(null); setStatus(''); setSearch(null); setRun(0);
    if (current.kind !== 'model') setSources(old => ({ ...old, [selected]: defaults[selected] }));
    if (selected === 'java') setWalls(initialWalls);
    if (selected === 'csharp') { setPower(10); setGravity(10); }
    if (selected === 'cpp') { setTargetX(280); setTargetY(60); setSpeed(100); }
  }
  function timeout(delay) {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { stop(); setResult({ error: true, text: 'Keyrslan tók of langan tíma og var stöðvuð. Stytta má lykkjur eða prófa aftur.' }); setStatus('Keyrsla stöðvuð'); }, delay);
  }
  function execute() {
    if (current.kind === 'model') {
      setRun(count => count + 1);
      if (selected === 'java') setSearch(findPath(walls));
      return;
    }
    setBusy(true); setStatus(selected === 'python' ? 'Undirbý Python…' : 'Keyri kóðann…'); setResult(null);
    try {
      if (!workerRef.current || workerKind.current !== selected) {
        stop();
        workerRef.current = new Worker(`/workers/${selected}.js`, selected === 'python' ? { type: 'module' } : undefined);
        workerKind.current = selected;
      }
      setBusy(true);
      const worker = workerRef.current;
      worker.onmessage = ({ data }) => {
        if (data.type === 'loading') { setStatus(data.text); return; }
        if (data.type === 'ready') { setStatus('Keyri Python…'); timeout(3000); return; }
        clearTimeout(timerRef.current); setBusy(false);
        setStatus(data.type === 'error' ? 'Villa í kóða' : 'Keyrslu lokið');
        setResult({ text: data.text, tables: data.tables, error: data.type === 'error' });
      };
      worker.onerror = event => { stop(); setStatus('Keyrsla tókst ekki'); setResult({ error: true, text: event.message || 'Ekki tókst að hlaða keyrsluvélinni. Athugaðu nettengingu og prófaðu aftur.' }); };
      timeout(selected === 'python' ? 90000 : selected === 'sql' ? 10000 : 2000);
      worker.postMessage({ code: source });
    } catch (error) { stop(); setResult({ error: true, text: error.message }); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = current.file; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function selectKey(event, index) {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % languages.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + languages.length - 1) % languages.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = languages.length - 1;
    if (next === undefined) return;
    event.preventDefault(); select(languages[next].id); document.getElementById(`tab-${languages[next].id}`)?.focus();
  }

  let preview = '';
  if (selected === 'html') preview = frameDocument(previewSource, '', reduced);
  if (selected === 'css') preview = frameDocument('<div class="stage"><div class="orb"></div></div>', `body{padding:0}${previewSource}`, reduced);
  if (selected === 'markdown') preview = frameDocument(marked.parse(previewSource), '', reduced);

  return <div className="playground">
    <div className="language-tabs" role="tablist" aria-label="Veldu forritunarprufu">{languages.map((item, i) => <button key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={selected === item.id} aria-controls="lab-panel" tabIndex={selected === item.id ? 0 : -1} onKeyDown={e => selectKey(e, i)} onClick={() => select(item.id)}><span className="language-icon">{item.short}</span>{item.name}</button>)}</div>
    <div id="lab-panel" role="tabpanel" aria-labelledby={`tab-${selected}`} tabIndex={0}>
      <div className="demo-heading"><div><p className="eyebrow">{current.name} / {String(languages.indexOf(current) + 1).padStart(2, '0')}</p><h3>{current.title}</h3><p>{current.intro}</p></div><span className={`runtime-badge ${current.kind === 'model' ? 'is-model' : ''}`}><i />{current.mode}</span></div>
      <div className="workbench">
        <div className="editor-pane"><div className="pane-bar"><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span>{current.file}</span><span>{current.kind === 'model' ? 'FRUMKÓÐI' : 'BREYTTU MÉR'}</span></div>
          <label className="sr-only" htmlFor="code-editor">{current.name} kóði</label><textarea id="code-editor" spellCheck="false" autoCapitalize="off" autoCorrect="off" value={source} readOnly={current.kind === 'model'} maxLength={12000} onChange={e => { setSources(old => ({ ...old, [selected]: e.target.value })); }} onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && current.kind === 'runtime' && !busy) { e.preventDefault(); execute(); } }} />
          <div className="editor-tools"><span>{current.kind === 'model' ? 'Kóðinn fylgir stillingunum.' : `${source.split('\n').length} línur · ${current.kind === 'preview' ? 'Lifandi forskoðun' : 'Ctrl + Enter keyrir'}`}</span><button onClick={download}>Sækja kóða ↓</button></div>
        </div>
        <div className="result-pane"><div className="pane-bar"><span>{current.kind === 'preview' ? 'FORSKOÐUN' : current.kind === 'model' ? 'HERMUN' : 'NIÐURSTAÐA'}</span><span className="result-dot" /></div>
          {current.kind === 'preview' && <iframe key={selected + previewSource} className="code-preview" title={`${current.name} forskoðun`} sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={preview} />}
          {current.kind === 'runtime' && <div className={`runtime-output ${result?.error ? 'has-error' : ''}`}>
            {busy ? <p className="loading-output"><span className="loader"/>{status}</p> : result ? <><pre>{result.text}</pre>{result.tables?.map((table, i) => <div className="sql-table-wrap" key={i}><table><thead><tr>{table.columns.map((name, j) => <th key={j}>{name}</th>)}</tr></thead><tbody>{table.values.map((row, r) => <tr key={r}>{row.map((value, c) => <td key={c}>{value === null ? 'NULL' : String(value)}</td>)}</tr>)}</tbody></table><p className="table-count">{table.values.length} línur</p></div>)}</> : <div className="output-empty"><span aria-hidden="true">↳</span><p>Kóðinn er tilbúinn.<br/>Ýttu á <strong>Keyra</strong> og sjáðu hvað gerist.</p>{selected === 'python' && <small>Python-vélin er sótt við fyrstu keyrslu.</small>}{selected === 'sql' && <small>SQLite · sýnigögn · gagnagrunnur endurstillist við hverja keyrslu.</small>}</div>}
          </div>}
          {selected === 'java' && <div className="model-output"><p className="model-hint">Smelltu á reiti til að breyta veggjunum.</p><div className="maze" key={run}>{Array.from({ length: ROWS * COLS }, (_, i) => <button key={i} disabled={i === 0 || i === ROWS * COLS - 1} aria-label={`Reitur ${Math.floor(i / COLS) + 1}, ${i % COLS + 1}${i === 0 ? ', upphaf' : i === 47 ? ', mark' : ''}`} aria-pressed={walls.includes(i)} className={`${walls.includes(i) ? 'wall' : ''} ${search?.path.includes(i) ? 'path' : search?.visited.includes(i) ? 'visited' : ''}`} style={{ '--cell-delay': `${(search?.visited.indexOf(i) ?? 0) * 15}ms` }} onClick={() => { setWalls(old => old.includes(i) ? old.filter(cell => cell !== i) : [...old, i]); setSearch(null); }}>{i === 0 ? 'S' : i === 47 ? 'M' : search?.path.includes(i) ? '·' : ''}</button>)}</div><div className="model-stats"><span>Breiddarleit / BFS</span><strong>{search ? search.path.length ? `${search.path.length - 1} skref að marki` : 'Engin leið að marki' : 'Bíður eftir leit'}</strong></div></div>}
          {selected === 'csharp' && <div className="model-output"><div className="model-controls"><Range label="Hoppkraftur" value={power} min={5} max={16} unit=" m/s" onChange={v => { setPower(v); setRun(0); }}/><Range label="Þyngdarhröðun" value={gravity} min={5} max={20} unit=" m/s²" onChange={v => { setGravity(v); setRun(0); }}/></div><svg className="model-scene" viewBox="0 0 360 210" role="img" aria-label="Hoppferill eftir hreyfijöfnu"><path d="M20 185H340" stroke="currentColor" opacity=".25"/><path d={`M${Array.from({length:41},(_,i)=>{const t=jump.time*i/40;return `${25+i*7.6},${185-(power*t-.5*gravity*t*t)*5}`;}).join(' L')}`} stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 5" fill="none"/><motion.circle key={`${run}-${power}-${gravity}`} r="10" fill="var(--accent)" initial={{cx:25,cy:185}} animate={run ? {cx: reduced ? 329 : Array.from({length:41},(_,i)=>25+i*7.6), cy: reduced ? 185 : Array.from({length:41},(_,i)=>{const t=jump.time*i/40;return 185-(power*t-.5*gravity*t*t)*5;})} : {cx:25,cy:185}} transition={{duration:reduced ? 0 : jump.time,ease:'linear'}}/></svg><div className="model-stats"><span>Hæð <strong>{jump.height.toFixed(2)} m</strong></span><span>Flugtími <strong>{jump.time.toFixed(2)} s</strong></span></div></div>}
          {selected === 'cpp' && <div className="model-output"><div className="model-controls"><Range label="Markpunktur X" value={targetX} min={70} max={320} onChange={v => {setTargetX(v);setRun(0);}}/><Range label="Markpunktur Y" value={targetY} min={25} max={170} onChange={v => {setTargetY(v);setRun(0);}}/><Range label="Hraði" value={speed} min={40} max={200} unit=" px/s" onChange={v => {setSpeed(v);setRun(0);}}/></div><svg className="model-scene steering-scene" viewBox="0 0 360 190" role="img" aria-label="Punktur ferðast eftir stefnu í átt að marki"><path d={`M35 130L${targetX} ${targetY}`} stroke="currentColor" strokeDasharray="4 5" opacity=".3"/><circle cx={targetX} cy={targetY} r="15" fill="none" stroke="var(--accent)"/><path d={`M${targetX-5} ${targetY}h10M${targetX} ${targetY-5}v10`} stroke="var(--accent)"/><motion.circle key={`${run}-${targetX}-${targetY}-${speed}`} r="9" fill="var(--ink)" initial={{cx:35,cy:130}} animate={run ? {cx:targetX,cy:targetY} : {cx:35,cy:130}} transition={{duration:reduced ? 0 : steering.time,ease:'linear'}}/></svg><div className="model-stats"><span>Vegalengd <strong>{steering.distance.toFixed(1)} px</strong></span><span>Ferðatími <strong>{steering.time.toFixed(2)} s</strong></span></div></div>}
        </div>
      </div>
      <div className="lab-actions"><div className="lab-action-buttons">{current.kind !== 'preview' && <button className="run-button" disabled={busy} onClick={execute}><span aria-hidden="true">▶</span>{busy ? 'Keyri…' : current.kind === 'model' ? 'Prófa hermun' : 'Keyra'}</button>}{busy && <button className="quiet-button" onClick={() => {stop(); setStatus('Keyrsla stöðvuð');}}>Stöðva</button>}<button className="quiet-button" onClick={reset}>Endurstilla ↺</button></div><p role="status" className="execution-status">{current.kind === 'model' ? 'Hermunin keyrir í JavaScript. Frumkóðann má sækja og keyra í viðeigandi þróunarumhverfi.' : current.kind === 'preview' ? 'Forskoðunin uppfærist þegar þú breytir kóðanum.' : status || 'Prófaðu, breyttu og keyrðu aftur.'}</p></div>
    </div>
  </div>;
}

export function HeroConsole() {
  const [run, setRun] = useState(0);
  return <div className="hero-console"><div className="pane-bar"><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span>hello.js</span><span>● LIVE</span></div><div className="hero-code"><p><span className="code-purple">const</span> developer = {'{'}</p><p className="indent">name: <span className="code-green">"Sölvi Hrafn"</span>,</p><p className="indent">curiosity: <span className="code-orange">Infinity</span>,</p><p className="indent">nextStep: <span className="code-green">"Búa eitthvað til"</span></p><p>{'};'}</p><p className="code-comment">// Best að prófa hugmyndina.</p><p><span className="code-purple">function</span> <span className="code-blue">build</span>() {'{'}</p><p className="indent"><span className="code-purple">return</span> <span className="code-green">"Hugmynd → Kóði → Leikur"</span>;</p><p>{'}'}</p></div><div className="hero-terminal"><span className="terminal-prompt">❯</span><p key={run} aria-live="polite">{run ? `Prufa ${run}: Hugmynd → Kóði → Leikur ✓` : 'Tilbúinn að prófa?'}</p><button onClick={() => setRun(n => n + 1)} aria-label="Keyra kynningarprufu">Keyra ↵</button></div><div className="terminal-bottom"><span>9 tungumál og snið</span><span>Endalaus forvitni <i>✳</i></span></div></div>;
}

export function LanguageRibbon() {
  return <div className="tech-ribbon wrap"><span className="eyebrow">Í PRÓFUSTOFUNNI</span><div>{languages.map(item => <a key={item.id} href="#profustofa" onClick={() => window.dispatchEvent(new CustomEvent('lab:select', { detail: item.id }))}>{item.name}</a>)}</div></div>;
}
