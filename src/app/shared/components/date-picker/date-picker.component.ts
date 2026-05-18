import { Component, ViewChild, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NzDatePickerComponent,
  NzDatePickerModule,
  NzDatePickerSizeType,
} from 'ng-zorro-antd/date-picker';
import { NzRadioModule } from 'ng-zorro-antd/radio';

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: [],
  imports: [NzDatePickerModule, NzRadioModule, FormsModule],
})
export class DatePickerComponent {
  /**
   * 数据对象
   */
  @Input() date!: number[];

  /**
   * 大小
   *
   * @type {('small' | '')}
   * @memberof DatePickerComponent
   */
  @Input() size: NzDatePickerSizeType = 'default';

  /**
   * 回调
   *
   * @memberof DatePickerComponent
   */
  @Output() readonly dateChange = new EventEmitter<number[]>();

  /**
   * 时间类型
   *
   * @memberof DatePickerComponent
   */
  dateType = 24 * 7;

  /**
   * 时间类型
   *
   * @memberof DeviceDataComponent
   */
  dateTypes = [
    { name: '最近三小时', value: 3 },
    { name: '最近一天', value: 24 },
    { name: '最近三天', value: 24 * 3 },
    { name: '最近一周', value: 24 * 7 },
    { name: '最近一月', value: 24 * 30 },
    { name: '最近三月', value: 24 * 30 * 3 },
    { name: '最近半年', value: 24 * 30 * 6 },
    { name: '最近一年', value: 24 * 30 * 12 },
  ];

  /**
   * 时间类型改变
   *
   * @param {number} value
   * @memberof DeviceDataComponent
   */
  dateTypeChange(value: number): void {
    this.dateType = value;
    const now = new Date().getTime();
    const startTime = now - 1000 * 60 * 60 * value;
    const date = [startTime, now];
    this.date = date;
    this.datePicker.close();
    this.dateChange.emit(this.date);
  }

  /**
   * 日期组件
   *
   * @type {NzDatePickerComponent}
   * @memberof GnssComponent
   */
  @ViewChild('datePicker', { static: false }) datePicker!: NzDatePickerComponent;

  constructor() {}
}
