'use client';

import { useEffect, useRef, useState } from 'react';
import { useExperience } from './experience';
import { createGame, drawGame, stepGame, WIDTH, HEIGHT } from './platformer-engine.mjs';

function emptyInput() { return { left: false, right: false, jumpPressed: false, jumpHeld: false }; }
function Platformer({ onClose }) {
  const canvasRef = useRef(null), inputRef = useRef(emptyInput()), stateRef = useRef(createGame()), pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({ stars: 0, deaths: 0, seconds: 0, won: false });
  const { reduced } = useExperience();
  const reducedRef = useRef(reduced);
  useEffect(() => { reducedRef.current = reduced; }, [reduced]);

  function pause(value) { inputRef.current = emptyInput(); pausedRef.current = value; setPaused(value); }
  function restart() { stateRef.current = createGame(); pause(false); canvasRef.current?.focus(); }

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas.getContext('2d'), dialog = canvas.closest('dialog');
    if (!ctx) return;
    let frame, lastTime, accumulator = 0, previousHud = '';
    function tick(time) {
      const delta = lastTime === undefined ? 0 : Math.min((time - lastTime) / 1000, .05);
      lastTime = time;
      if (!pausedRef.current) {
        accumulator += delta;
        while (accumulator >= 1 / 120) { stepGame(stateRef.current, inputRef.current, 1 / 120); inputRef.current.jumpPressed = false; accumulator -= 1 / 120; }
      } else accumulator = 0;
      drawGame(ctx, stateRef.current, { paused: pausedRef.current, reduced: reducedRef.current, time });
      const state = stateRef.current;
      const nextHud = { stars: state.collected.length, deaths: state.deaths, seconds: Math.floor(state.elapsed), won: state.won };
      const key = JSON.stringify(nextHud);
      if (key !== previousHud) { previousHud = key; setHud(nextHud); }
      frame = requestAnimationFrame(tick);
    }
    function keydown(event) {
      if (event.target.tagName === 'BUTTON') return;
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', ' ', 'a', 'd', 'w', 'r', 'p'].includes(key)) event.preventDefault();
      if (key === 'r' && !event.repeat) { restart(); return; }
      if (key === 'p' && !event.repeat) { pause(!pausedRef.current); return; }
      if (pausedRef.current || stateRef.current.won) return;
      if (key === 'arrowleft' || key === 'a') inputRef.current.left = true;
      if (key === 'arrowright' || key === 'd') inputRef.current.right = true;
      if (key === ' ' || key === 'arrowup' || key === 'w') { if (!inputRef.current.jumpHeld) inputRef.current.jumpPressed = true; inputRef.current.jumpHeld = true; }
    }
    function keyup(event) {
      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') inputRef.current.left = false;
      if (key === 'arrowright' || key === 'd') inputRef.current.right = false;
      if (key === ' ' || key === 'arrowup' || key === 'w') inputRef.current.jumpHeld = false;
    }
    function leave() { if (!stateRef.current.won) pause(true); }
    function visibility() { if (document.hidden) leave(); }
    dialog.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup); window.addEventListener('blur', leave); document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); dialog.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', leave); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  function touchStart(event, action) {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    if (pausedRef.current || stateRef.current.won) return;
    if (action === 'jump') { inputRef.current.jumpPressed = !inputRef.current.jumpHeld; inputRef.current.jumpHeld = true; }
    else inputRef.current[action] = true;
  }
  function touchEnd(action) { if (action === 'jump') inputRef.current.jumpHeld = false; else inputRef.current[action] = false; }
  function touchButton(action, label, content) {
    return <button type="button" aria-label={label} className={`platformer-touch ${action === 'jump' ? 'touch-jump' : ''}`} onPointerDown={event => touchStart(event, action)} onPointerUp={() => touchEnd(action)} onPointerCancel={() => touchEnd(action)} onLostPointerCapture={() => touchEnd(action)} onBlur={() => touchEnd(action)} onKeyDown={event => { if ((event.key === ' ' || event.key === 'Enter') && !pausedRef.current && !stateRef.current.won) { event.preventDefault(); if (action === 'jump') { inputRef.current.jumpPressed = !inputRef.current.jumpHeld; inputRef.current.jumpHeld = true; } else inputRef.current[action] = true; } }} onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); touchEnd(action); } }}>{content}</button>;
  }
  return <>
    <div className="platformer-title"><div><p className="eyebrow">LÍTILL LEIKUR / STÓR FORVITNI</p><h2 id="platformer-title">Stjörnuhlaup<span>✦</span></h2></div><button className="platformer-close" onClick={onClose} aria-label="Loka leik">×</button></div>
    <p id="platformer-instructions" className="platformer-instructions">Safnaðu stjörnunum þremur og komstu að fánanum. Ef þú dettur heldurðu stjörnunum sem þú fannst.</p>
    <div className="platformer-hud"><span aria-live="polite">✦ {hud.stars} / 3 stjörnur</span><span>{hud.seconds} s</span><span>{hud.deaths} föll</span></div>
    <div className="platformer-screen"><canvas ref={canvasRef} width={WIDTH} height={HEIGHT} tabIndex={0} className="platformer-canvas" aria-label="Stjörnuhlaup, platformer. Notaðu örvatakka til að hreyfa þig og bilslá til að hoppa." aria-describedby="platformer-instructions">Vafrinn þinn þarf að styðja Canvas til að spila leikinn.</canvas></div>
    <div className="platformer-controls"><div className="direction-controls">{touchButton('left', 'Til vinstri', '←')}{touchButton('right', 'Til hægri', '→')}</div>{touchButton('jump', 'Hoppa', <>Hoppa <span aria-hidden="true">↑</span></>)}</div>
    <div className="platformer-toolbar"><p><kbd>←</kbd> <kbd>→</kbd> eða A / D <span>·</span> <kbd>bilslá</kbd> hoppar <span>·</span> P gerir hlé</p><div>{!hud.won && <button onClick={() => { pause(!paused); canvasRef.current?.focus(); }}>{paused ? 'Halda áfram' : 'Gera hlé'}</button>}<button onClick={restart}>{hud.won ? 'Spila aftur ↺' : 'Byrja aftur ↺'}</button></div></div>
    <p className="platformer-win" role="status">{hud.won ? `Vel gert! Þú náðir öllum stjörnunum á ${hud.seconds} sekúndum.` : paused ? 'Leikurinn er í hléi.' : 'Stutt hopp: slepptu bilslánni fyrr. Lengra hopp: haltu henni inni.'}</p>
  </>;
}

export function GameLauncher() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null), triggerRef = useRef(null);
  useEffect(() => {
    if (!open) { dialogRef.current?.close(); return; }
    const dialog = dialogRef.current, previousOverflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => dialog.querySelector('canvas')?.focus());
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; triggerRef.current?.focus({ preventScroll: true }); };
  }, [open]);
  return <><button ref={triggerRef} className="try-game-button" onClick={() => setOpen(true)} aria-haspopup="dialog"><span aria-hidden="true">▶</span> Prófa leik</button><dialog ref={dialogRef} className="platformer-dialog" aria-labelledby="platformer-title" onClose={() => setOpen(false)} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === dialogRef.current) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setOpen(false); } }}>{open && <Platformer onClose={() => setOpen(false)} />}</dialog></>;
}
