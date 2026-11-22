// Canvas painting for Midnight Vault: the museum floor, walls and doors,
// loot, guards with their vision cones, sweeping cameras, the thief, the
// HUD (score, loot, alarm meter, lives, timer), and every screen.

import {
  ALARM,
  CAMERA,
  COLS,
  FIELD,
  FONT,
  GUARD,
  PALETTE,
  ROWS,
  THIEF,
  TILE,
} from './config.js';
import { levelName } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const HUD_HEIGHT = 46;

function alarmColour(value) {
  if (value < 35) return PALETTE.alarmLow;
  if (value < 70) return PALETTE.alarmMid;
  return PALETTE.alarmHigh;
}

function drawCone(ctx, x, y, angle, distance, halfAngle, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, distance, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, distance, angle - halfAngle, angle + halfAngle);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, map) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = map[row][col];
      const x = col * TILE;
      const y = row * TILE;
      if (cell === '#') {
        ctx.fillStyle = PALETTE.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.wallTop;
        ctx.fillRect(x, y, TILE, 4);
        continue;
      }
      ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, TILE, TILE);
      if (cell === 'D') {
        ctx.fillStyle = PALETTE.door;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = PALETTE.doorFrame;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      }
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let col = 0; col <= COLS; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * TILE, 0);
    ctx.lineTo(col * TILE, FIELD.height);
    ctx.stroke();
  }
  for (let row = 0; row <= ROWS; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * TILE);
    ctx.lineTo(FIELD.width, row * TILE);
    ctx.stroke();
  }
}

function drawLoot(ctx, loot, time) {
  for (const item of loot) {
    if (item.taken) continue;
    if (item.kind === 'coin') {
      ctx.beginPath();
      ctx.arc(item.x, item.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.coin;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = PALETTE.coinRing;
      ctx.stroke();
      ctx.fillStyle = PALETTE.coinRing;
      ctx.font = 'bold 12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', item.x, item.y + 0.5);
    } else if (item.kind === 'painting') {
      ctx.fillStyle = PALETTE.paintingFrame;
      ctx.fillRect(item.x - 14, item.y - 10, 28, 20);
      ctx.fillStyle = PALETTE.paintingArt;
      ctx.fillRect(item.x - 11, item.y - 7, 22, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(item.x - 11, item.y - 7, 22, 4);
    } else if (item.kind === 'diamond') {
      const pulse = 1 + Math.sin(time * 3) * 0.12;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 26 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = PALETTE.diamondGlow;
      ctx.fill();
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.diamond;
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(-11, -11, 22, 6);
      ctx.restore();
    }
  }
}

function drawExit(ctx, exit, open) {
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
  ctx.globalAlpha = open ? 0.9 : 0.45;
  ctx.fillRect(exit.x - TILE / 2 + 4, exit.y - TILE / 2 + 4, TILE - 8, TILE - 8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a0d14';
  ctx.font = 'bold 11px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', exit.x, exit.y);
}

function drawGuards(ctx, guards) {
  for (const guard of guards) {
    const alerted = guard.alert;
    drawCone(
      ctx,
      guard.x,
      guard.y,
      guard.angle,
      GUARD.viewDistance,
      GUARD.viewHalfAngle,
      alerted ? PALETTE.alertCone : PALETTE.guardCone,
      alerted ? PALETTE.alertConeEdge : PALETTE.guardConeEdge,
    );
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.guard;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = alerted ? PALETTE.alarmHigh : PALETTE.guardTrim;
    ctx.stroke();
    // Facing tick: the guard's cap brim.
    ctx.beginPath();
    ctx.moveTo(guard.x + Math.cos(guard.angle) * 6, guard.y + Math.sin(guard.angle) * 6);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD.radius + 4), guard.y + Math.sin(guard.angle) * (GUARD.radius + 4));
    ctx.lineWidth = 4;
    ctx.strokeStyle = PALETTE.guardTrim;
    ctx.stroke();
    if (alerted) {
      ctx.fillStyle = PALETTE.alarmHigh;
      ctx.font = 'bold 20px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('!', guard.x, guard.y - GUARD.radius - 4);
    }
  }
}

function drawCameras(ctx, cameras) {
  for (const camera of cameras) {
    drawCone(
      ctx,
      camera.x,
      camera.y,
      camera.angle,
      CAMERA.viewDistance,
      CAMERA.viewHalfAngle,
      PALETTE.cameraCone,
      PALETTE.cameraConeEdge,
    );
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.cameraBody;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5252';
    ctx.fill();
  }
}

function drawThief(ctx, thief) {
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, THIEF.radius, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.thief;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.stroke();
  // Hood point and mask: which way the thief faces.
  const angle = Math.atan2(thief.dirY, thief.dirX);
  ctx.beginPath();
  ctx.moveTo(thief.x + Math.cos(angle) * 4, thief.y + Math.sin(angle) * 4);
  ctx.lineTo(thief.x + Math.cos(angle) * (THIEF.radius + 3), thief.y + Math.sin(angle) * (THIEF.radius + 3));
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.fill();
}

function formatTime(seconds) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function drawHud(ctx, state) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 15px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LEVEL ${state.levelIndex + 1} · ${levelName(state.levelIndex)}`, 14, HUD_HEIGHT / 2);
  ctx.fillText(`SCORE ${state.score}`, 250, HUD_HEIGHT / 2);
  ctx.fillText(`LOOT ${state.lootTaken}/${state.lootTotal}`, 400, HUD_HEIGHT / 2);
  // Lives as little masks.
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(560 + i * 26, HUD_HEIGHT / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < state.lives ? PALETTE.thiefTrim : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }
  // Alarm meter.
  ctx.fillStyle = PALETTE.muted;
  ctx.font = 'bold 13px ' + FONT;
  ctx.fillText('ALARM', 660, HUD_HEIGHT / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(730, HUD_HEIGHT / 2 - 8, 220, 16);
  ctx.fillStyle = alarmColour(state.alarm);
  ctx.fillRect(730, HUD_HEIGHT / 2 - 8, Math.round(220 * (state.alarm / ALARM.bustAt)), 16);
  ctx.strokeStyle = PALETTE.text;
  ctx.lineWidth = 1;
  ctx.strokeRect(730, HUD_HEIGHT / 2 - 8, 220, 16);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`${Math.round(state.alarm)}`, 958, HUD_HEIGHT / 2);
  ctx.textAlign = 'right';
  ctx.fillText(formatTime(state.time), FIELD.width - 14, HUD_HEIGHT / 2);
  // Objective line under the bar.
  ctx.textAlign = 'left';
  ctx.fillStyle = state.diamondTaken ? PALETTE.exit : PALETTE.muted;
  ctx.font = '13px ' + FONT;
  ctx.fillText(
    state.diamondTaken ? 'Diamond secured — reach the green EXIT!' : 'Steal the diamond, then reach the EXIT. Stay out of the cones.',
    14,
    HUD_HEIGHT + 14,
  );
}

function drawOverlay(ctx, lines, accent) {
  ctx.fillStyle = 'rgba(5, 7, 12, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  let y = FIELD.height / 2 - (lines.length - 1) * 26;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const line of lines) {
    ctx.fillStyle = line.colour || PALETTE.text;
    ctx.font = line.big ? 'bold 44px ' + FONT : '17px ' + FONT;
    ctx.fillText(line.text, FIELD.width / 2, y);
    y += line.big ? 62 : 30;
  }
  if (accent) {
    ctx.fillStyle = accent;
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(accent, FIELD.width / 2, y + 18);
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function draw(state, screen, best, time) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const level = state.level;
    drawFloor(ctx, level.map);
    drawExit(ctx, level.exit, state.diamondTaken);
    drawLoot(ctx, level.loot, time);
    drawGuards(ctx, level.guards);
    drawCameras(ctx, level.cameras);
    drawThief(ctx, state.thief);
    drawHud(ctx, state);

    if (screen === SCREEN_TITLE) {
      drawOverlay(ctx, [
        { text: 'MIDNIGHT VAULT', big: true },
        { text: 'A top-down stealth heist in three museum halls.' },
        { text: 'WASD / arrows to move · grab the diamond · reach the EXIT' },
        { text: 'Guards and cameras raise the alarm when they see you.' },
        { text: 'At 100 the heist is busted. Three lives. Good luck, thief.' },
      ], 'Press SPACE to start');
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay(ctx, [{ text: 'PAUSED', big: true }, { text: 'The guards wait. The diamond waits.' }], 'Press P to keep stealing');
    } else if (screen === SCREEN_LEVEL) {
      const bonus = state.lastLevelBonus || { timeBonus: 0, stealthBonus: 0 };
      const cleared = state.lastClearedName || levelName(state.levelIndex);
      drawOverlay(ctx, [
        { text: 'CLEAN GETAWAY', big: true },
        { text: `${cleared} cleared — score ${state.score}` },
        { text: `Time bonus +${bonus.timeBonus} · Stealth bonus +${bonus.stealthBonus}` },
      ], 'Press SPACE for the next hall');
    } else if (screen === SCREEN_OVER) {
      drawOverlay(ctx, [
        { text: 'BUSTED', big: true },
        { text: `The museum keeps its diamond. Score ${state.score} · Best ${best}` },
      ], 'Press SPACE to try again');
    } else if (screen === SCREEN_WIN) {
      drawOverlay(ctx, [
        { text: 'THE PERFECT HEIST', big: true },
        { text: `All three halls emptied in ${formatTime(state.time)}` },
        { text: `Final score ${state.score} · Best ${best}` },
      ], 'Press SPACE to steal again');
    }
  }

  return { draw };
}
