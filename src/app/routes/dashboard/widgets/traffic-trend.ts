import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';

interface TrafficBar {
  time: string;
  value: number;
  active?: boolean;
  raw?: number;
}

interface TrendRangeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'dashboard-traffic-trend',
  template: `
    <section class="trend-card">
      <div class="trend-card-header">
        <h2>{{ title }}</h2>
        <div class="trend-card-tools">
          <span>{{ badge }}</span>
          <nz-select
            class="trend-range-select"
            [ngModel]="selectedRange"
            (ngModelChange)="selectedRangeChange.emit($event)"
          >
            @for (option of rangeOptions; track option.value) {
              <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
            }
          </nz-select>
        </div>
      </div>

      <div
        class="trend-chart"
        [style.--trend-bar-count]="bars.length || 1"
        [attr.aria-label]="selectedRangeLabel + '代理请求趋势柱状图'"
      >
        @for (item of bars; track trackBar($index, item)) {
          <div class="trend-bar-wrap" [attr.aria-label]="item.time + ' ' + (item.raw || 0) + ' 次请求'">
            <div
              class="trend-bar"
              [class.trend-bar-active]="item.active"
              [style.height.%]="item.value"
            ></div>
          </div>
        }
      </div>

      <div class="trend-axis">
        @for (item of axisLabels; track item) {
          <span>{{ item }}</span>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .trend-card {
        box-sizing: border-box;
        min-width: 0;
        height: 100%;
        padding: 28px 30px 26px;
        border: 1px solid rgb(var(--nm-primary-rgb) / 12%);
        border-radius: 22px;
        background: rgb(255 255 255 / 88%);
        box-shadow:
          0 18px 44px rgb(var(--nm-primary-rgb) / 8%),
          inset 0 1px 0 rgb(255 255 255 / 90%);
      }

      .trend-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .trend-card-header h2 {
        margin: 0;
        color: #182334;
        font-size: 20px;
        font-weight: 800;
        line-height: 1.35;
      }

      .trend-card-tools {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
        gap: 10px;
      }

      .trend-card-tools span {
        flex: 0 0 auto;
        padding: 7px 14px;
        border-radius: 999px;
        color: var(--nm-primary);
        font-size: 14px;
        font-weight: 800;
        line-height: 1;
        background: rgb(var(--nm-primary-rgb) / 10%);
      }

      .trend-range-select {
        width: 132px;
      }

      .trend-chart {
        position: relative;
        display: grid;
        grid-template-columns: repeat(var(--trend-bar-count, 8), minmax(0, 1fr));
        align-items: end;
        gap: clamp(12px, 2vw, 34px);
        height: 218px;
        margin-top: 42px;
        padding: 0 8px 0 10px;
        overflow: hidden;
      }

      .trend-chart::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 1px;
        background: rgb(var(--nm-primary-rgb) / 12%);
        content: '';
      }

      .trend-bar-wrap {
        display: flex;
        align-items: end;
        justify-content: center;
        height: 100%;
        min-width: 0;
      }

      .trend-bar {
        width: min(56px, 100%);
        min-height: 22px;
        border-radius: 9px 9px 0 0;
        background: rgb(var(--nm-primary-rgb) / 10%);
      }

      .trend-bar-active {
        background: linear-gradient(180deg, var(--nm-primary-hover) 0%, var(--nm-primary) 100%);
      }

      .trend-axis {
        display: flex;
        justify-content: space-between;
        margin-top: 14px;
        padding-top: 10px;
        color: #b0beb9;
        font-size: 14px;
        font-weight: 700;
      }

      @media (max-width: 767px) {
        .trend-card {
          padding: 22px 20px;
        }

        .trend-card-header {
          display: grid;
        }

        .trend-card-tools {
          justify-content: space-between;
        }

        .trend-chart {
          gap: 14px;
          height: 180px;
          margin-top: 30px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, NzSelectModule],
})
export class DashboardTrafficTrendComponent {
  @Input() title = '请求趋势';
  @Input() badge = '过去 1 小时';
  @Input() selectedRange = '1h';
  @Input() rangeOptions: TrendRangeOption[] = [];
  @Output() selectedRangeChange = new EventEmitter<string>();
  @Input() bars: TrafficBar[] = [
    { time: '10:00', value: 24, raw: 8 },
    { time: '10:10', value: 38, raw: 12 },
    { time: '10:20', value: 18, raw: 5 },
    { time: '10:25', value: 58, raw: 18, active: true },
    { time: '10:35', value: 31, raw: 9 },
    { time: '10:45', value: 45, raw: 14 },
    { time: '10:50', value: 62, raw: 21 },
    { time: '11:00', value: 28, raw: 7 },
  ];

  get axisLabels(): string[] {
    if (this.bars.length <= 5) return this.bars.map((item) => item.time);
    const indexes = [0, Math.floor(this.bars.length / 3), Math.floor((this.bars.length / 3) * 2), this.bars.length - 1];
    return indexes.map((index) => this.bars[index]?.time).filter(Boolean);
  }

  get selectedRangeLabel(): string {
    return this.rangeOptions.find((item) => item.value === this.selectedRange)?.label || this.badge;
  }

  protected trackBar(index: number, item: TrafficBar): string {
    return `${this.selectedRange}-${index}-${item.time}`;
  }
}
