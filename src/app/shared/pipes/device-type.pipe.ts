import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'deviceType',
})
export class DeviceTypePipe implements PipeTransform {
  typeTag: Record<string, any> = {
    GP: { text: '北斗接收机', color: 'geekblue' },
    GPS: { text: '北斗接收机', color: 'geekblue' },
    LF: { text: '裂缝计', color: 'lime' },
    YL: { text: '雨量计', color: 'orange' },
    QJ: { text: '倾角计', color: 'gold' },
    LB: { text: '声光报警', color: 'red' },
    QX: { text: '气象站', color: 'cyan' },
    TS: { text: '土壤水分计', color: 'orange' },
    MM: { text: '地基雷达', color: 'red' },
    WY: { text: '位移计', color: 'gold' },
    SZY: { text: '水准仪', color: 'geekblue' },
    SP: { text: '视频', color: 'blue' },
  };

  transform(key: string): any {
    if (!key) {
      return '';
    }
    return this.typeTag[key];
  }
}
