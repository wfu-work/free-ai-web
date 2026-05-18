import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timesFormat',
})
export class TimesFormatPipe implements PipeTransform {
  transform(times: number | string): string {
    if (!times) return '';
    const numericTimes = Number(times);
    if (Number.isNaN(numericTimes) || numericTimes === 0) {
      if (typeof times === 'string') return times;
      return `${times}`;
    }
    times = numericTimes / 1000;
    if (times < 60) {
      return `${times.toFixed(2)}s`;
    }
    times = times / 60;
    if (times < 60) {
      return `${times.toFixed(2)}m`;
    }
    times = times / 60;
    if (times < 60) {
      return `${times.toFixed(2)}h`;
    }
    times = times / 60;
    if (times < 60) {
      return `${times.toFixed(2)}d`;
    }
    return '';
  }
}
