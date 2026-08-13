export function resolveCapitalGain(previous: number | null | undefined, current: number | null | undefined): number | null {
  if (previous == null || current == null || !Number.isFinite(previous) || !Number.isFinite(current) || current <= previous) return null;
  const gain = Math.round(current) - Math.round(previous);
  return gain > 0 ? gain : null;
}
