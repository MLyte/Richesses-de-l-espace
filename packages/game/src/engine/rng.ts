export function nextRandom(seed: number): [number, number] {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next / 0x1_0000_0000, next];
}

export function rollDie(seed: number): [number, number] {
  const [value, nextSeed] = nextRandom(seed);
  return [Math.floor(value * 6) + 1, nextSeed];
}
