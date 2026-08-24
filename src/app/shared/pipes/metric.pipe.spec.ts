import { describe, expect, it } from 'vitest';

import { MetricPipe } from './metric.pipe';

describe('MetricPipe', () => {
  const pipe = new MetricPipe();

  it('按展示场景统一转换数值单位', () => {
    expect(pipe.transform(445_095_062, 'compact')).toBe('445.1M');
    expect(pipe.transform(12_295.2, 'duration')).toBe('12.3 s');
    expect(pipe.transform(387.9325, 'currency')).toBe('$387.93');
    expect(pipe.transform(445_095_062, 'number')).toBe('445,095,062');
  });

  it('允许金额详情保留更多精度', () => {
    expect(pipe.transform(0.000123, 'currency', 6)).toBe('$0.000123');
  });
});
