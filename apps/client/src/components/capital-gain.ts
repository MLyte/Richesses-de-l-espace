export function resolveCapitalGain(previous: number | null | undefined, current: number | null | undefined): number | null {
  if (previous == null || current == null || !Number.isFinite(previous) || !Number.isFinite(current) || current <= previous) return null;
  return Math.round((current - previous) * 10) / 10;
}
