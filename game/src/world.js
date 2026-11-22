// The museum and its rules. Three levels, each a tile map:
//   '#' wall   '.' floor   'D' doorway   'c' coin   'p' painting
//   '*' diamond (the objective)   'E' exit   'T' the thief's start.
// Guards walk waypoint loops; cameras sweep from wall mounts. A guard or a
// camera that sees the thief raises the alarm; at 100 the heist is busted.
// Grab the diamond, then reach the exit to clear the level.

import {
  ALARM,
  CAMERA,
  COLS,
  FIELD,
  GUARD,
  LOOT_POINTS,
  ROWS,
  STEALTH_BONUS,
  STEALTH_BONUS_MAX_ALARM,
  THIEF,
  TILE,
  TIME_BONUS_PER_SECOND,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_BUST = 4;
export const EVENT_LEVEL = 8;
export const EVENT_WIN = 16;
export const EVENT_ALARM_HIGH = 32;

const LEVELS = [
  {
    name: 'Gallery',
    parSeconds: 75,
    map: [
      '################################',
      '#......#........#..............#',
      '#..T...#...c....#....p.........#',
      '#......#........#..............#',
      '#......D........D......c.......#',
      '#......#........#..............#',
      '###.####........####.#####.#####',
      '#......#........#......c.......#',
      '#..c...D....*...D.............E#',
      '#......#........#..............#',
      '###.####........####.#####.#####',
      '#......#........#..............#',
      '#..p...#...c....#..............#',
      '#......D........D......c.......#',
      '#......#........#..............#',
      '#......#........#......p.......#',
      '#......#........#..............#',
      '################################',
    ],
    guards: [
      { waypoints: [[20, 2], [27, 2], [27, 5], [20, 5]] },
      { waypoints: [[10, 12], [14, 12], [14, 16], [10, 16]] },
    ],
    cameras: [
      { tile: [16, 1], baseAngle: Math.PI / 2, sweep: 0.6, speed: 0.55 },
      { tile: [7, 10], baseAngle: Math.PI * 0.75, sweep: 0.5, speed: 0.45 },
    ],
  },
  {
    name: 'Vault Corridor',
    parSeconds: 90,
    map: [
      '################################',
      '#..T...#......c.#.......p......#',
      '#......#.........#.............#',
      '#..c...D....p...D......c.......#',
      '#......#.........#.............#',
      '####.#####.#######.#####.#######',
      '#......#.........#.............#',
      '#..p...D....c...D......*...c...#',
      '#......#.........#.............#',
      '####.#####.#######.#####.#######',
      '#......#.........#.............#',
      '#..c...D....p...D......c.......#',
      '#......#.........#.............#',
      '#......#.........#.......p.....#',
      '#......D........D..............#',
      '#......#.........#.............#',
      '#..c...#......c.#.............E#',
      '################################',
    ],
    guards: [
      { waypoints: [[9, 1], [13, 1], [13, 3], [9, 3]] },
      { waypoints: [[19, 6], [25, 6], [25, 8], [19, 8]] },
      { waypoints: [[9, 11], [13, 11], [13, 14], [9, 14]] },
    ],
    cameras: [
      { tile: [15, 5], baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.6 },
      { tile: [7, 9], baseAngle: -Math.PI / 2, sweep: 0.6, speed: 0.5 },
      { tile: [23, 9], baseAngle: Math.PI / 2, sweep: 0.55, speed: 0.65 },
    ],
  },
  {
    name: 'The Vault',
    parSeconds: 105,
    map: [
      '################################',
      '#..T...#.......#........p......#',
      '#......#...c...#...c...........#',
      '#......D.......D.......c.......#',
      '#......#.......#...............#',
      '###.#######.#########.####.#####',
      '#......#.......#...............#',
      '#..p...D...c...D.......p.......#',
      '#......#.......#...............#',
      '###.#######.#########.####.#####',
      '#......#.......#........c......#',
      '#..c...D...p...D...............#',
      '#......#.......#.........*.....#',
      '#......#.......#...............#',
      '###.#######.#########.####.#####',
      '#......#.......#...............#',
      '#..c...#...c...#.......c......E#',
      '################################',
    ],
    guards: [
      { waypoints: [[9, 1], [13, 1], [13, 3], [9, 3]] },
      { waypoints: [[18, 6], [24, 6], [24, 8], [18, 8]] },
      { waypoints: [[9, 11], [13, 11], [13, 13], [9, 13]] },
      { waypoints: [[21, 11], [27, 11], [27, 13], [21, 13]] },
    ],
    cameras: [
      { tile: [15, 5], baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.7 },
      { tile: [7, 9], baseAngle: -Math.PI / 2, sweep: 0.6, speed: 0.55 },
      { tile: [24, 14], baseAngle: -Math.PI / 2, sweep: 0.65, speed: 0.6 },
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;

export function levelName(index) {
  return LEVELS[index].name;
}

function tileAt(map, col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return map[row][col];
}

function isWallTile(map, col, row) {
  return tileAt(map, col, row) === '#';
}

/** True when the point (px) sits inside a wall tile. */
function blockedAt(map, x, y) {
  return isWallTile(map, Math.floor(x / TILE), Math.floor(y / TILE));
}

/** Line of sight: true when no wall stands between the two points. Sampling
 * starts a step past the watcher, so a camera mounted on a wall tile is not
 * blinded by the very tile it sits on. */
function hasLineOfSight(map, x0, y0, x1, y1) {
  const distance = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(distance / 8));
  const skip = Math.ceil(45 / 8);
  for (let i = skip; i < steps; i += 1) {
    const t = i / steps;
    if (blockedAt(map, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
  }
  return true;
}

function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when the watcher sees the thief: in range, inside the cone, in sight. */
function canSee(map, watcher, distance, halfAngle) {
  const dx = watcher.targetX - watcher.x;
  const dy = watcher.targetY - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > distance) return false;
  if (Math.abs(angleDifference(Math.atan2(dy, dx), watcher.angle)) > halfAngle) return false;
  return hasLineOfSight(map, watcher.x, watcher.y, watcher.targetX, watcher.targetY);
}

function tileCentre(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

/** Breadth-first path over walkable tiles, as a list of tile centres. */
export function findPath(map, fromCol, fromRow, toCol, toRow) {
  const key = (c, r) => r * COLS + c;
  const cameFrom = new Map();
  const queue = [[fromCol, fromRow]];
  cameFrom.set(key(fromCol, fromRow), null);
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === toCol && r === toRow) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (isWallTile(map, nc, nr)) continue;
      if (cameFrom.has(key(nc, nr))) continue;
      cameFrom.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!cameFrom.has(key(toCol, toRow))) return [];
  const tiles = [];
  let current = [toCol, toRow];
  while (current) {
    tiles.push(current);
    current = cameFrom.get(key(current[0], current[1]));
  }
  tiles.reverse();
  return tiles.map(([c, r]) => tileCentre(c, r));
}

function buildLevel(index) {
  const def = LEVELS[index];
  const map = def.map;
  let thiefStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: 0, y: 0, col: 0, row: 0 };
  const loot = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = map[row][col];
      const centre = tileCentre(col, row);
      if (cell === 'T') thiefStart = centre;
      else if (cell === 'E') exit = { ...centre, col, row };
      else if (cell === 'c') loot.push({ kind: 'coin', x: centre.x, y: centre.y, taken: false });
      else if (cell === 'p') loot.push({ kind: 'painting', x: centre.x, y: centre.y, taken: false });
      else if (cell === '*') loot.push({ kind: 'diamond', x: centre.x, y: centre.y, taken: false });
    }
  }
  const guards = def.guards.map((g) => {
    const first = tileCentre(g.waypoints[0][0], g.waypoints[0][1]);
    const second = tileCentre(g.waypoints[1][0], g.waypoints[1][1]);
    return {
      x: first.x,
      y: first.y,
      angle: Math.atan2(second.y - first.y, second.x - first.x),
      waypoints: g.waypoints.map(([c, r]) => tileCentre(c, r)),
      wpIndex: 1,
      wait: 0,
      alert: false,
      lastSeenX: first.x,
      lastSeenY: first.y,
      loseSight: 0,
    };
  });
  const cameras = def.cameras.map((c) => {
    const centre = tileCentre(c.tile[0], c.tile[1]);
    return {
      x: centre.x,
      y: centre.y,
      baseAngle: c.baseAngle,
      sweep: c.sweep,
      speed: c.speed,
      angle: c.baseAngle,
      phase: 0,
    };
  });
  return { def, map, thiefStart, exit, loot, guards, cameras };
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: null,
    thief: { x: 0, y: 0, dirX: 1, dirY: 0, moving: false },
    alarm: 0,
    maxAlarm: 0,
    lives: 3,
    score: 0,
    levelScore: 0,
    time: 0,
    levelTime: 0,
    diamondTaken: false,
    lootTaken: 0,
    lootTotal: 0,
    spotted: false,
    won: false,
  };

  function loadLevel(index) {
    state.levelIndex = index;
    state.level = buildLevel(index);
    state.thief.x = state.level.thiefStart.x;
    state.thief.y = state.level.thiefStart.y;
    state.thief.dirX = 1;
    state.thief.dirY = 0;
    state.alarm = 0;
    state.maxAlarm = 0;
    state.levelScore = 0;
    state.levelTime = 0;
    state.diamondTaken = false;
    state.lootTaken = 0;
    state.lootTotal = state.level.loot.length;
    state.spotted = false;
  }

  function reset() {
    state.lives = 3;
    state.score = 0;
    state.time = 0;
    state.won = false;
    loadLevel(0);
  }

  function moveCircle(entity, dx, dy) {
    const map = state.level.map;
    const radius = THIEF.radius;
    const nextX = entity.x + dx;
    if (
      !blockedAt(map, nextX - radius, entity.y - radius) &&
      !blockedAt(map, nextX + radius, entity.y - radius) &&
      !blockedAt(map, nextX - radius, entity.y + radius) &&
      !blockedAt(map, nextX + radius, entity.y + radius)
    ) {
      entity.x = nextX;
    }
    const nextY = entity.y + dy;
    if (
      !blockedAt(map, entity.x - radius, nextY - radius) &&
      !blockedAt(map, entity.x + radius, nextY - radius) &&
      !blockedAt(map, entity.x - radius, nextY + radius) &&
      !blockedAt(map, entity.x + radius, nextY + radius)
    ) {
      entity.y = nextY;
    }
  }

  function stepGuard(guard, dt) {
    const map = state.level.map;
    const thief = state.thief;
    const watcher = {
      x: guard.x,
      y: guard.y,
      angle: guard.angle,
      targetX: thief.x,
      targetY: thief.y,
    };
    const sees = canSee(map, watcher, GUARD.viewDistance, GUARD.viewHalfAngle);
    if (sees) {
      guard.alert = true;
      guard.lastSeenX = thief.x;
      guard.lastSeenY = thief.y;
      guard.loseSight = 0;
    } else if (guard.alert) {
      guard.loseSight += dt;
      if (guard.loseSight > GUARD.loseSightAfter && state.alarm < ALARM.alertAt) {
        guard.alert = false;
      }
    }
    const speed = guard.alert ? GUARD.alertSpeed : GUARD.patrolSpeed;
    let target;
    if (guard.alert) {
      target = { x: guard.lastSeenX, y: guard.lastSeenY };
    } else {
      target = guard.waypoints[guard.wpIndex];
    }
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      if (!guard.alert) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        guard.wait = GUARD.waitAtPoint;
      }
      return sees;
    }
    if (guard.wait > 0) {
      guard.wait -= dt;
      return sees;
    }
    const step = Math.min(dist, speed * dt);
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
    guard.angle = Math.atan2(dy, dx);
    return sees;
  }

  function stepCamera(camera, dt) {
    camera.phase += dt * camera.speed;
    camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
    const map = state.level.map;
    const thief = state.thief;
    return canSee(
      map,
      { x: camera.x, y: camera.y, angle: camera.angle, targetX: thief.x, targetY: thief.y },
      CAMERA.viewDistance,
      CAMERA.viewHalfAngle,
    );
  }

  /**
   * Advance the world one fixed step. `dir` is the thief's normalised
   * movement [x, y]; `attract` runs the level as a demo (guards patrol, the
   * thief stays put). Returns an event bitmask.
   */
  function step(dt, dir, attract) {
    const level = state.level;
    let events = 0;
    state.time += dt;
    state.levelTime += dt;

    // The thief moves (not in the title-screen demo).
    if (!attract) {
      const thief = state.thief;
      thief.moving = dir[0] !== 0 || dir[1] !== 0;
      if (thief.moving) {
        thief.dirX = dir[0];
        thief.dirY = dir[1];
        moveCircle(thief, dir[0] * THIEF.speed * dt, dir[1] * THIEF.speed * dt);
      }
    }

    // Guards and cameras watch; anyone seeing the thief raises the alarm.
    let seen = false;
    for (const guard of level.guards) {
      if (stepGuard(guard, dt)) seen = true;
    }
    for (const camera of level.cameras) {
      if (stepCamera(camera, dt)) seen = true;
    }
    const wasSpotted = state.spotted;
    state.spotted = seen;
    if (seen && !wasSpotted) events |= EVENT_SPOTTED;
    if (seen) {
      state.alarm = Math.min(ALARM.bustAt, state.alarm + ALARM.risePerSecond * dt);
      if (state.alarm >= 75 && state.maxAlarm < 75) events |= EVENT_ALARM_HIGH;
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.fallPerSecond * dt);
    }
    state.maxAlarm = Math.max(state.maxAlarm, state.alarm);

    // A guard that touches the thief busts the heist at once.
    for (const guard of level.guards) {
      if (Math.hypot(guard.x - state.thief.x, guard.y - state.thief.y) < GUARD.radius + THIEF.radius) {
        state.alarm = ALARM.bustAt;
      }
    }

    // Loot pickups.
    for (const item of level.loot) {
      if (item.taken) continue;
      if (Math.hypot(item.x - state.thief.x, item.y - state.thief.y) < 28) {
        item.taken = true;
        state.lootTaken += 1;
        const points = LOOT_POINTS[item.kind];
        state.score += points;
        state.levelScore += points;
        if (item.kind === 'diamond') state.diamondTaken = true;
        events |= EVENT_PICKUP;
      }
    }

    // Busted: lose a life, restart the level (loot already banked stays).
    if (state.alarm >= ALARM.bustAt) {
      state.lives -= 1;
      events |= EVENT_BUST;
      if (state.lives <= 0) return events;
      const keptScore = state.score - state.levelScore;
      loadLevel(state.levelIndex);
      state.score = keptScore;
      return events;
    }

    // Exit, once the diamond is taken, clears the level.
    if (state.diamondTaken) {
      const exit = level.exit;
      if (Math.abs(state.thief.x - exit.x) < TILE / 2 + 6 && Math.abs(state.thief.y - exit.y) < TILE / 2 + 6) {
        const timeBonus = Math.max(0, Math.round((level.def.parSeconds - state.levelTime) * TIME_BONUS_PER_SECOND));
        const stealthBonus = state.maxAlarm < STEALTH_BONUS_MAX_ALARM ? STEALTH_BONUS : 0;
        state.score += timeBonus + stealthBonus;
        state.levelScore += timeBonus + stealthBonus;
        state.lastLevelBonus = { timeBonus, stealthBonus };
        state.lastClearedName = level.def.name;
        if (state.levelIndex + 1 >= LEVEL_COUNT) {
          state.won = true;
          events |= EVENT_WIN;
        } else {
          loadLevel(state.levelIndex + 1);
          events |= EVENT_LEVEL;
        }
      }
    }
    return events;
  }

  reset();
  return { state, reset, loadLevel, step, findPath: (fromCol, fromRow, toCol, toRow) => findPath(state.level.map, fromCol, fromRow, toCol, toRow) };
}
