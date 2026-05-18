import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'warnColor',
})
export class WarnColorPipe implements PipeTransform {
  typeTag: Record<string, any> = {
    0: 'green',
    1: 'yellow',
    2: 'orange',
    3: 'red',
  };

  transform(key: string): any {
    if (!key) {
      return 'green';
    }
    return this.typeTag[key];
  }
}
