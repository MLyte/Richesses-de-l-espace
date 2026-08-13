export const SPACEFARER_FIRST_NAMES = ["Yuri", "Neil", "Valentina", "Buzz", "Thomas"] as const;

export function pickSpacefarerFirstName(random: () => number = Math.random): string {
  const index = Math.floor(random() * SPACEFARER_FIRST_NAMES.length);
  return SPACEFARER_FIRST_NAMES[index] ?? SPACEFARER_FIRST_NAMES[0];
}
