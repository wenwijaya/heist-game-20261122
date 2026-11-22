// A tiny seeded random generator (mulberry32), so a seed always deals the
// same museum: the same guard timing, the same loot shimmer, the same frame.

export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max) from the seeded generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one entry of an array with the seeded generator. */
export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}
