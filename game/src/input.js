// Keyboard input: WASD or arrows to move, Space or Enter to confirm,
// P or Escape to pause, M to mute the (tiny) sound effects.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function createInput(target) {
  const held = new Set();
  let actions = 0;

  function onKeyDown(event) {
    if (event.code in MOVE_KEYS) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      actions |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onBlur() {
    held.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /** Normalised movement direction from the keys held down, [x, y]. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const step = MOVE_KEYS[code];
        if (step) {
          x += step[0];
          y += step[1];
        }
      }
      if (x === 0 && y === 0) return [0, 0];
      const length = Math.hypot(x, y);
      return [x / length, y / length];
    },
    /** Actions pressed since the last call, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
