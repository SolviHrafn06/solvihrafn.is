export const WIDTH = 800;
export const HEIGHT = 450;
export const platforms = [
  { x: 0, y: 390, w: 355, h: 60, ground: true },
  { x: 455, y: 390, w: 345, h: 60, ground: true },
  { x: 90, y: 310, w: 125, h: 16 },
  { x: 285, y: 240, w: 125, h: 16 },
  { x: 500, y: 180, w: 115, h: 16 },
  { x: 640, y: 280, w: 100, h: 16 },
];
export const stars = [{ x: 150, y: 282 }, { x: 342, y: 212 }, { x: 557, y: 152 }];
export const goal = { x: 748, y: 322, w: 40, h: 68 };

export function createGame() {
  return { player: { x: 35, y: 358, w: 26, h: 32, vx: 0, vy: 0, grounded: true, facing: 1 }, collected: [], deaths: 0, elapsed: 0, won: false, coyote: .1, jumpBuffer: 0, respawning: 0 };
}
const approach = (value, target, step) => value < target ? Math.min(value + step, target) : Math.max(value - step, target);
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function stepGame(state, input, dt) {
  if (state.won) return state;
  dt = Math.min(Math.max(dt, 0), 1 / 30);
  state.elapsed += dt;
  if (state.respawning > 0) { state.respawning = Math.max(0, state.respawning - dt); return state; }
  const p = state.player;
  state.coyote = p.grounded ? .1 : Math.max(0, state.coyote - dt);
  state.jumpBuffer = input.jumpPressed ? .12 : Math.max(0, state.jumpBuffer - dt);
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  p.vx = approach(p.vx, direction * 220, (direction ? 1800 : 2200) * dt);
  if (direction) p.facing = direction;
  if (state.jumpBuffer > 0 && state.coyote > 0) {
    p.vy = -520; p.grounded = false; state.coyote = 0; state.jumpBuffer = 0;
  }
  if (!input.jumpHeld && p.vy < -190) p.vy = -190;
  p.x = Math.max(0, Math.min(WIDTH - p.w, p.x + p.vx * dt));
  const previousBottom = p.y + p.h;
  p.vy = Math.min(p.vy + 1400 * dt, 800);
  p.y += p.vy * dt;
  p.grounded = false;
  if (p.vy >= 0) {
    const landings = platforms.filter(surface => p.x + p.w > surface.x && p.x < surface.x + surface.w && previousBottom <= surface.y + .01 && p.y + p.h >= surface.y);
    if (landings.length) { const surface = landings.reduce((a, b) => a.y < b.y ? a : b); p.y = surface.y - p.h; p.vy = 0; p.grounded = true; }
  }
  stars.forEach((star, index) => {
    const dx = star.x - Math.max(p.x, Math.min(star.x, p.x + p.w));
    const dy = star.y - Math.max(p.y, Math.min(star.y, p.y + p.h));
    if (!state.collected.includes(index) && dx * dx + dy * dy < 13 * 13) state.collected.push(index);
  });
  if (state.collected.length === stars.length && overlaps(p, goal)) state.won = true;
  if (p.y > HEIGHT + 40) {
    state.deaths += 1; state.respawning = .25;
    Object.assign(p, { x: 35, y: 358, vx: 0, vy: 0, grounded: true });
    state.coyote = 0; state.jumpBuffer = 0;
  }
  return state;
}

export function drawGame(ctx, state, { paused = false, reduced = false, time = 0 } = {}) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#262c24'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#ee754c'; ctx.beginPath(); ctx.arc(652, 105, 58, 0, Math.PI * 2); ctx.fill();
  const mountain = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); };
  mountain(-100, 130, 560, 290, '#34412e'); mountain(270, 95, 690, 325, '#435239');
  ctx.fillStyle = '#d8dec318';
  const drift = reduced ? 0 : Math.sin(time * .0002) * 15;
  ctx.fillRect(80 + drift, 76, 110, 12); ctx.fillRect(380 - drift, 116, 65, 10);
  ctx.fillStyle = '#ccdbad13';
  for (let i = 0; i < 25; i++) ctx.fillRect((i * 113 + 20) % 800, (i * 37 + 20) % 175, 2, 2);
  for (const surface of platforms) {
    ctx.fillStyle = surface.ground ? '#66764d' : '#68774f'; ctx.fillRect(surface.x, surface.y, surface.w, surface.h);
    ctx.fillStyle = '#a7b38e'; ctx.fillRect(surface.x, surface.y, surface.w, 6);
    if (surface.ground) { ctx.fillStyle = '#24272024'; for (let x = surface.x + 18; x < surface.x + surface.w; x += 28) ctx.fillRect(x, surface.y + 9, 2, surface.h); }
  }
  ctx.strokeStyle = '#dedfc7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(goal.x + 12, goal.y); ctx.lineTo(goal.x + 12, 390); ctx.stroke();
  ctx.fillStyle = state.collected.length === 3 ? '#ee754c' : '#8d9776';
  ctx.beginPath(); ctx.moveTo(goal.x + 14, goal.y); ctx.lineTo(goal.x + 47, goal.y + 11); ctx.lineTo(goal.x + 14, goal.y + 22); ctx.closePath(); ctx.fill();
  stars.forEach((star, index) => {
    if (state.collected.includes(index)) return;
    const y = star.y + (reduced ? 0 : Math.sin(time * .003 + index * 2) * 3);
    ctx.fillStyle = '#efd28d'; ctx.beginPath(); ctx.moveTo(star.x, y - 11); ctx.lineTo(star.x + 4, y - 4); ctx.lineTo(star.x + 11, y); ctx.lineTo(star.x + 4, y + 4); ctx.lineTo(star.x, y + 11); ctx.lineTo(star.x - 4, y + 4); ctx.lineTo(star.x - 11, y); ctx.lineTo(star.x - 4, y - 4); ctx.closePath(); ctx.fill();
  });
  const p = state.player;
  ctx.fillStyle = '#00000020'; ctx.fillRect(Math.round(p.x) - 2, p.y + p.h + 2, p.w + 4, 3);
  ctx.fillStyle = '#c3bda0'; ctx.fillRect(Math.round(p.x) + 4, Math.round(p.y) + 3, p.w, p.h - 3);
  ctx.fillStyle = '#e8e5c9'; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h - 4);
  ctx.fillStyle = '#242720'; ctx.fillRect(Math.round(p.x) + (p.facing > 0 ? 18 : 4), Math.round(p.y) + 8, 5, 5);
  ctx.fillStyle = '#b4b192'; ctx.fillRect(Math.round(p.x) + 3, Math.round(p.y) + p.h - 5, 7, 5); ctx.fillRect(Math.round(p.x) + 17, Math.round(p.y) + p.h - 5, 7, 5);
  if (paused || state.won) {
    ctx.fillStyle = '#1a2017c9'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center'; ctx.fillStyle = '#efd28d'; ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(state.won ? 'Vel gert! ✦ ✦ ✦' : 'Hlé', WIDTH / 2, 210);
    ctx.fillStyle = '#e8e5c9'; ctx.font = '17px system-ui, sans-serif';
    ctx.fillText(state.won ? 'Allar stjörnurnar komnar heim.' : 'Ýttu á Halda áfram til að spila.', WIDTH / 2, 247);
  }
}
