// The screenshot scenes behind ?shot=start|play|alarm|escape. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (breadth-first path to a target tile, then
// straight at the next waypoint), so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { STEP, TILE } from './config.js';
import { EVENT_BUST, EVENT_LEVEL, EVENT_WIN } from './world.js';
import { SCREEN_LEVEL, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 15;
const ALARM_MAX_SECONDS = 12;
/** Stop lingering once the alarm reaches this: hot, but not busted. */
const ALARM_TARGET = 72;
const ESCAPE_LIMIT_SECONDS = 120;
const SAMPLE = STEP;
/** The tile the alarm scene's thief creeps to: in camera B's sweep, and no
 * guard patrols the left hall, so the thief is seen but never touched. */
const ALARM_TILE = [4, 13];
/** The play scene stops this close to the diamond, so it stays in frame. */
const PLAY_STOP_DISTANCE = 130;

/** Steer the thief toward `point` (pixels) at full speed; [0, 0] when there. */
function steerToward(state, point) {
  const dx = point.x - state.thief.x;
  const dy = point.y - state.thief.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 8) return [0, 0];
  return [dx / dist, dy / dist];
}

/** Follow a path of points, dropping each one as the thief reaches it. */
function followPath(state, path) {
  while (path.length > 0) {
    const dir = steerToward(state, path[0]);
    if (dir[0] === 0 && dir[1] === 0) path.shift();
    else return dir;
  }
  return [0, 0];
}

function diamondTile(state) {
  for (const item of state.level.loot) {
    if (item.kind === 'diamond') {
      return [Math.floor(item.x / TILE), Math.floor(item.y / TILE)];
    }
  }
  return null;
}

function thiefTile(state) {
  return [Math.floor(state.thief.x / TILE), Math.floor(state.thief.y / TILE)];
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any name other than play, alarm or escape is the
 * title scene.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'alarm' && name !== 'escape') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) world.step(SAMPLE, [0, 0], true);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'alarm') {
    const [fromCol, fromRow] = thiefTile(state);
    const path = world.findPath(fromCol, fromRow, ALARM_TILE[0], ALARM_TILE[1]);
    for (let i = 0; i < 60 / SAMPLE; i += 1) {
      const dir = followPath(state, path);
      const events = world.step(SAMPLE, dir, false);
      if (events & EVENT_BUST) break;
      if (path.length === 0) break;
    }
    for (let i = 0; i < ALARM_MAX_SECONDS / SAMPLE; i += 1) {
      const events = world.step(SAMPLE, [0, 0], false);
      if (events & EVENT_BUST) break;
      if (world.state.alarm >= ALARM_TARGET) break;
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  // Play and escape both hunt the diamond first.
  let path = [];
  let target = 'diamond';
  const limit = name === 'escape' ? ESCAPE_LIMIT_SECONDS : PLAY_SECONDS;
  for (let i = 0; i < limit / SAMPLE; i += 1) {
    if (target === 'diamond' && state.diamondTaken) {
      target = 'exit';
      path = [];
    }
    if (path.length === 0) {
      const [fromCol, fromRow] = thiefTile(state);
      if (target === 'diamond') {
        const d = diamondTile(state);
        path = d ? world.findPath(fromCol, fromRow, d[0], d[1]) : [];
      } else {
        path = world.findPath(fromCol, fromRow, state.level.exit.col, state.level.exit.row);
      }
    }
    const dir = followPath(state, path);
    const events = world.step(SAMPLE, dir, false);
    if (events & EVENT_BUST) break;
    if (events & (EVENT_LEVEL | EVENT_WIN)) {
      return { screen: SCREEN_LEVEL, best: state.score };
    }
    if (name === 'play') {
      const diamond = state.level.loot.find((item) => item.kind === 'diamond');
      if (diamond && Math.hypot(diamond.x - state.thief.x, diamond.y - state.thief.y) < PLAY_STOP_DISTANCE) break;
    }
  }
  return { screen: SCREEN_PLAY, best: state.score };
}
