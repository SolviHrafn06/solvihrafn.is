export const ROWS = 6;
export const COLS = 8;
export const initialWalls = [10, 11, 12, 18, 26, 28, 29, 30, 38];

export function findPath(walls, rows = ROWS, cols = COLS) {
  const blocked = new Set(walls), queue = [0], visited = new Set([0]), parent = new Map();
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (cell === rows * cols - 1) {
      const path = [cell];
      while (parent.has(path[0])) path.unshift(parent.get(path[0]));
      return { visited: queue.slice(0, i + 1), path };
    }
    const r = Math.floor(cell / cols), c = cell % cols;
    for (const [nr, nc] of [[r - 1, c], [r, c + 1], [r + 1, c], [r, c - 1]]) {
      const next = nr * cols + nc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !blocked.has(next) && !visited.has(next)) {
        parent.set(next, cell); visited.add(next); queue.push(next);
      }
    }
  }
  return { visited: queue, path: [] };
}

export function jumpMetrics(power, gravity) {
  return { time: 2 * power / gravity, height: power * power / (2 * gravity), distance: 8 * power / gravity };
}

export function steeringMetrics(x, y, speed) {
  const distance = Math.hypot(x - 35, y - 130);
  return { distance, time: distance / speed };
}
