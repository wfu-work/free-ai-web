import { Component, ViewChild, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import setHours from 'date-fns/setHours';
import {
  DisabledTimeFn,
  NzDatePickerComponent,
  NzDatePickerModule,
  NzDatePickerSizeType,
} from 'ng-zorro-antd/date-picker';

@Component({
  selector: 'app-long-date-picker',
  templateUrl: './long-date-picker.component.html',
  styleUrls: [],
  imports: [FormsModule, NzDatePickerModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LongDatePickerComponent),
      multi: true,
    },
  ],
})
export class LongDatePickerComponent {
  /**
   * 数据对象
   */
  _time: number | null = null;

  /**
   * 绑定的时间
   *
   * @type {Date}
   * @memberof LongDatePickerComponent
   */
  date!: Date;

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
   * 当前时间
   *
   * @memberof EditComponent
   */
  today = new Date();

  /**
   * 日期选择器默认时间
   *
   * @memberof EditComponent
   */
  timeDefaultValue = setHours(new Date(), 0);

  range(start: number, end: number): number[] {
    const result: number[] = [];
    for (let i = start; i < end; i++) {
      result.push(i);
    }
    return result;
  }

  disabledDateTime: DisabledTimeFn = () => ({
    nzDisabledHours: () => this.range(0, 24).splice(4, 24),
    nzDisabledMinutes: () => this.range(30, 60),
    nzDisabledSeconds: () => [55, 56],
  });

  /**
   * 日期组件
   *
   * @type {NzDatePickerComponent}
   * @memberof GnssComponent
   */
  @ViewChild('datePicker', { static: false }) datePicker!: NzDatePickerComponent;

  get time() {
    return this.date.getTime();
  }

  set time(val: number) {
    if (this._time !== val) {
      this._time = val;
      this.propagateChange(val);
    }
  }

  writeValue(val: any): void {
    if (val && null != val) {
      this.date = new Date(val);
      this._time = this.date.getTime();
      this.propagateChange(this._time);
    }
  }

  propagateChange = (_: any) => {
    console.log(_);
  };

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(): void {}

  setDisabledState?(): void {}

  constructor() {}

  handleChange(tag: boolean) {
    if (!tag && this.date) {
      this._time = this.date.getTime();
      this.propagateChange(this._time);
    }
  }
}
