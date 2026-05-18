import { Pipe, PipeTransform } from '@angular/core';

import { NavSys } from '../common/constant.module';

@Pipe({
  name: 'nav',
})
export class NavDictionaryPipe implements PipeTransform {
  /**
   * 卫星系统
   *
   * @type {*}
   * @memberof ListComponent
   */
  navSys: Record<string, string> = NavSys;

  transform(key: string | number): string {
    if (!key) {
      return '';
    }
    return this.navSys[key.toString()];
  }
}
