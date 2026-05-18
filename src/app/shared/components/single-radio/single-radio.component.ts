import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface SingleRadioOption {
  label: string;
  value: string | number;
  icon?: string;
  iconUrl?: string;
  disabled?: boolean;
  description?: string;
}

@Component({
  selector: 'app-single-radio',
  standalone: true,
  templateUrl: './single-radio.component.html',
  styleUrls: ['./single-radio.component.less'],
  imports: [CommonModule, NzIconModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SingleRadioComponent),
      multi: true,
    },
  ],
})
export class SingleRadioComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() options: SingleRadioOption[] = [];
  @Input() columns = 3;
  @Input() disabled = false;
  @Input() value: string | number | null = null;

  @Output() readonly valueChange = new EventEmitter<string | number | null>();

  innerValue: string | number | null = null;
  touched = false;

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | number | null): void {
    this.innerValue = value ?? null;
    this.value = this.innerValue;
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  select(option: SingleRadioOption): void {
    if (this.disabled || option.disabled || this.innerValue === option.value) {
      this.markTouched();
      return;
    }

    this.innerValue = option.value;
    this.value = option.value;
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.markTouched();
  }

  isChecked(option: SingleRadioOption): boolean {
    return this.innerValue === option.value;
  }

  asGridTemplateColumns(): string {
    const safeColumns = Math.max(this.options.length, Number(this.columns) || 1);
    return `repeat(${safeColumns}, minmax(0, 1fr))`;
  }

  trackByValue(_: number, option: SingleRadioOption): string | number {
    return option.value;
  }

  private markTouched(): void {
    if (this.touched) {
      return;
    }
    this.touched = true;
    this.onTouched();
  }
}
