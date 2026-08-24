import { Pipe, PipeTransform } from '@angular/core';

import {
  formatCompactMetric,
  formatMetricCurrency,
  formatMetricDuration,
  formatMetricNumber,
} from '../utils/metric.util';

export type MetricPipeFormat = 'compact' | 'number' | 'duration' | 'currency';

/** 全局统计数值格式：短文本用 compact，详情/悬浮提示用 number。 */
@Pipe({
  name: 'metric',
  standalone: true,
  pure: true,
})
export class MetricPipe implements PipeTransform {
  transform(
    value: number | string | null | undefined,
    format: MetricPipeFormat = 'number',
    precision?: number,
  ): string {
    const numericValue = typeof value === 'string' ? Number(value) : value;
    switch (format) {
      case 'compact':
        return formatCompactMetric(numericValue);
      case 'duration':
        return formatMetricDuration(numericValue);
      case 'currency':
        return formatMetricCurrency(numericValue, precision);
      case 'number':
      default:
        return formatMetricNumber(numericValue);
    }
  }
}
