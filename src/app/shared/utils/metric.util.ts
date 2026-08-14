const COMPACT_UNITS = [
  { threshold: 1_000_000_000_000, suffix: 'T' },
  { threshold: 1_000_000_000, suffix: 'B' },
  { threshold: 1_000_000, suffix: 'M' },
  { threshold: 1_000, suffix: 'K' },
] as const;

/** 将较大的统计值缩写为 K / M / B / T，保留一位有效小数。 */
export function formatCompactMetric(value?: number | null): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '-';

  const unitIndex = COMPACT_UNITS.findIndex((item) => Math.abs(amount) >= item.threshold);
  let unit = COMPACT_UNITS[unitIndex];
  if (!unit) return Math.round(amount).toLocaleString('zh-CN');

  let scaledAmount = amount / unit.threshold;
  if (unitIndex > 0 && Math.abs(Number(scaledAmount.toFixed(1))) >= 1_000) {
    unit = COMPACT_UNITS[unitIndex - 1];
    scaledAmount = amount / unit.threshold;
  }

  const scaled = scaledAmount.toFixed(1).replace(/\.0$/, '');
  return `${scaled}${unit.suffix}`;
}

/** 根据时长自动选择 ms / s / min / h。 */
export function formatMetricDuration(value?: number | null): string {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds)) return '-';

  const absolute = Math.abs(milliseconds);
  if (absolute < 1_000) return `${Math.round(milliseconds)} ms`;
  if (absolute < 60_000) return `${formatSingleDecimal(milliseconds / 1_000)} s`;
  if (absolute < 3_600_000) return `${formatSingleDecimal(milliseconds / 60_000)} min`;
  return `${formatSingleDecimal(milliseconds / 3_600_000)} h`;
}

function formatSingleDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
