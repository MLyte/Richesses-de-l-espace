export function splitPlayerWings<T>(players: readonly T[]): [T[], T[]] {
  const leftCount = Math.ceil(players.length / 2);
  return [players.slice(0, leftCount), players.slice(leftCount)];
}
