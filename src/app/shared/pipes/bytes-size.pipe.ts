import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'byteSize',
})
export class ByteSizePipe implements PipeTransform {
  transform(size: number): string {
    if (!size) {
      return '';
    }
    if (0 === size) {
      return '0 Bytes';
    }
    const c = 1024;
    const e = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const f = Math.floor(Math.log(size) / Math.log(c));
    return `${parseFloat((size / Math.pow(c, f)).toFixed(2))} ${e[f]}`;
  }
}
