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

/** 将金额统一格式化为美元；常规金额保留两位，极小金额自动保留四位。 */
export function formatMetricCurrency(value?: number | null, precision?: number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  const defaultDigits = amount !== 0 && Math.abs(amount) < 0.01 ? 4 : 2;
  const digits = Math.max(0, Math.min(Math.round(precision ?? defaultDigits), 8));
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** 精确显示统计值，适合 title、详情和复制前的可读文本。 */
export function formatMetricNumber(value?: number | null): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '-';
  return amount.toLocaleString('zh-CN', { maximumFractionDigits: 3 });
}

function formatSingleDecimal(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}
