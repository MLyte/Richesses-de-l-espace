export const SPACEFARER_NAMES = ["Yuri Gagarine", "Neil Armstrong", "Valentina Terechkova", "Buzz Aldrin", "Thomas Pesquet"] as const;

export function pickSpacefarerName(random: () => number = Math.random): string {
  const index = Math.floor(random() * SPACEFARER_NAMES.length);
  return SPACEFARER_NAMES[index] ?? SPACEFARER_NAMES[0];
}

export function resolvePlayerName(input: string, suggestedName: string): string {
  return input.trim() || suggestedName;
}
