import { describe, expect, it } from 'vitest';

import { formatCompactMetric, formatMetricDuration } from './metric.util';

describe('metric utils', () => {
  it('按数值级别缩写统计值', () => {
    expect(formatCompactMetric(999)).toBe('999');
    expect(formatCompactMetric(1_250)).toBe('1.3K');
    expect(formatCompactMetric(25_690_996)).toBe('25.7M');
    expect(formatCompactMetric(398_623_247)).toBe('398.6M');
    expect(formatCompactMetric(999_999)).toBe('1M');
    expect(formatCompactMetric(1_000_000_000)).toBe('1B');
  });

  it('按时长级别选择单位', () => {
    expect(formatMetricDuration(850)).toBe('850 ms');
    expect(formatMetricDuration(36_679.2)).toBe('36.7 s');
    expect(formatMetricDuration(90_000)).toBe('1.5 min');
    expect(formatMetricDuration(7_200_000)).toBe('2 h');
  });

  it('拒绝无效数值', () => {
    expect(formatCompactMetric(Number.NaN)).toBe('-');
    expect(formatMetricDuration(undefined)).toBe('-');
  });
});
