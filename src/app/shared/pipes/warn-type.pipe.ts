import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'warnType',
})
export class WarnTypePipe implements PipeTransform {
  typeTag: Record<string, any> = {
    0: '正常',
    1: '黄色',
    2: '橙色',
    3: '红色',
  };

  transform(key: string): any {
    if (!key) {
      return '正常';
    }
    return this.typeTag[key];
  }
}
