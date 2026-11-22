// Midnight Vault — every tuning number and colour in one place.
// Top-down stealth heist: cross the museum, dodge guard vision cones and
// sweeping cameras, grab the diamond, and slip out the exit before the
// alarm hits 100. The playfield is a fixed 1280x720 logical area; the
// renderer scales it to the window, so no rule depends on the screen size.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  speed: 205,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 72,
  alertSpeed: 132,
  /** Seconds a guard waits at each patrol waypoint. */
  waitAtPoint: 0.9,
  /** Vision cone: how far and how wide a guard sees. */
  viewDistance: 205,
  viewHalfAngle: 0.62,
  /** Seconds of losing sight before an alerted guard gives up. */
  loseSightAfter: 3,
};

export const CAMERA = {
  /** Vision cone of a wall camera. */
  viewDistance: 245,
  viewHalfAngle: 0.46,
};

export const ALARM = {
  /** Points per second while any guard or camera sees the thief. */
  risePerSecond: 45,
  /** Points per second it falls while nobody sees the thief. */
  fallPerSecond: 8,
  /** At this level guards go alert and hunt the thief. */
  alertAt: 55,
  /** At 100 the heist is busted. */
  bustAt: 100,
};

export const LIVES = 3;

export const LOOT_POINTS = { coin: 10, painting: 50, diamond: 200 };

/** Time bonus: 5 points per second under par on a finished level. */
export const TIME_BONUS_PER_SECOND = 5;
/** Stealth bonus: finishing a level with the alarm never over this. */
export const STEALTH_BONUS = 150;
export const STEALTH_BONUS_MAX_ALARM = 50;

export const BEST_KEY = 'midnight-vault.best';

export const PALETTE = {
  backdrop: '#0a0d14',
  floorA: '#1c2230',
  floorB: '#171c28',
  floorLine: '#232a3a',
  wall: '#39415a',
  wallTop: '#5a6488',
  door: '#2b3247',
  doorFrame: '#6b76a0',
  thief: '#101014',
  thiefTrim: '#e8e8f0',
  guard: '#2b3a67',
  guardTrim: '#8fa8ff',
  guardCone: 'rgba(255, 214, 90, 0.16)',
  guardConeEdge: 'rgba(255, 214, 90, 0.5)',
  alertCone: 'rgba(255, 70, 70, 0.22)',
  alertConeEdge: 'rgba(255, 70, 70, 0.65)',
  cameraCone: 'rgba(255, 90, 90, 0.13)',
  cameraConeEdge: 'rgba(255, 90, 90, 0.45)',
  cameraBody: '#8a8f9e',
  coin: '#f2c94c',
  coinRing: '#a67c1a',
  paintingFrame: '#7a5a2e',
  paintingArt: '#4a7a5a',
  diamond: '#7fe7ff',
  diamondGlow: 'rgba(127, 231, 255, 0.25)',
  exit: '#39d98a',
  exitLocked: '#5a6478',
  panel: 'rgba(10, 13, 20, 0.82)',
  text: '#eef1f5',
  muted: '#9aa3b8',
  alarmLow: '#39d98a',
  alarmMid: '#f2c94c',
  alarmHigh: '#ff5252',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
