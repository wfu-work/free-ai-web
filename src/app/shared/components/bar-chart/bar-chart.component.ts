import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  EventEmitter,
} from '@angular/core';
import { ECharts, EChartsCoreOption } from 'echarts';
import * as echarts from 'echarts';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

export interface BarChartItem {
  name: string;
  value: number;
  color?: string;
  emphasisColor?: string;
}

export interface BarChartAction {
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface BarChartStatusCard {
  title: string;
  description?: string;
  color?: string;
}

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.less'],
  imports: [CommonModule, NzEmptyModule, NzSpinModule, NzIconModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartRef', { static: false }) chartRef?: ElementRef<HTMLDivElement>;

  @Input() title = '';
  @Input() subtitle = '';
  @Input() height = 280;
  @Input() loading = false;
  @Input() emptyText = '暂无柱状图数据';
  @Input() data: BarChartItem[] = [];
  @Input() colors: string[] = ['#edf1f3', '#e5eaee', '#c9ebf5', '#0b7751', '#0c7f56'];
  @Input() highlightIndexes: number[] = [];
  @Input() showXAxis = false;
  @Input() showYAxis = false;
  @Input() barRadius = 10;
  @Input() actions: BarChartAction[] = [];
  @Input() statusCard?: BarChartStatusCard;
  @Input() extraOptions?: EChartsCoreOption;
  @Output() readonly actionClick = new EventEmitter<BarChartAction>();

  protected chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  protected get hasData(): boolean {
    return this.data.length > 0;
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.bindResize();
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['data'] ||
      changes['colors'] ||
      changes['highlightIndexes'] ||
      changes['showXAxis'] ||
      changes['showYAxis'] ||
      changes['loading'] ||
      changes['barRadius'] ||
      changes['extraOptions']
    ) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  protected trackByAction = (_: number, item: BarChartAction): string => item.label;

  protected onActionClick(action: BarChartAction): void {
    if (action.disabled) {
      return;
    }
    this.actionClick.emit(action);
  }

  private initChart(): void {
    const element = this.chartRef?.nativeElement;
    if (!element || this.chart) {
      return;
    }
    this.chart = echarts.init(element);
  }

  private bindResize(): void {
    const element = this.chartRef?.nativeElement;
    if (!element) {
      return;
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(element);
  }

  private renderChart(): void {
    if (!this.chartRef?.nativeElement) {
      return;
    }

    this.initChart();
    if (!this.chart) {
      return;
    }

    if (!this.hasData) {
      this.chart.clear();
      return;
    }

    this.chart.setOption(this.buildOptions(), true);
    this.chart.resize();
  }

  private buildOptions(): EChartsCoreOption {
    return {
      animationDuration: 500,
      animationEasing: 'cubicOut',
      grid: {
        left: 0,
        right: 0,
        top: 8,
        bottom: this.showXAxis ? 28 : 0,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(12, 127, 86, 0.06)',
          },
        },
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: 'rgba(18,71,50,0.08)',
        borderWidth: 1,
        textStyle: {
          color: '#31423b',
        },
        padding: [10, 12],
        extraCssText: 'box-shadow: 0 10px 24px rgba(15,52,38,0.08); border-radius: 12px;',
      },
      xAxis: {
        type: 'category',
        data: this.data.map((item) => item.name),
        axisLine: {
          show: this.showXAxis,
          lineStyle: {
            color: 'rgba(18,71,50,0.08)',
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          show: this.showXAxis,
          color: '#8a9c96',
          fontSize: 12,
          margin: 12,
        },
      },
      yAxis: {
        type: 'value',
        show: this.showYAxis,
        splitLine: {
          show: this.showYAxis,
          lineStyle: {
            color: 'rgba(18,71,50,0.06)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          type: 'bar',
          barWidth: '76%',
          data: this.data.map((item, index) => {
            const color = item.color || this.getBarColor(index);
            return {
              value: item.value,
              itemStyle: {
                color,
                borderRadius: [this.barRadius, this.barRadius, 0, 0],
              },
              emphasis: {
                itemStyle: {
                  color: item.emphasisColor || color,
                },
              },
            };
          }),
          emphasis: {
            scale: true,
          },
        },
      ],
      ...this.extraOptions,
    };
  }

  private getBarColor(index: number): string {
    if (this.highlightIndexes.includes(index)) {
      return this.colors[index % Math.max(this.colors.length, 1) || 0] || '#0c7f56';
    }

    if (this.colors.length <= 1) {
      return this.colors[0] || '#edf1f3';
    }

    const normalColors = this.colors.slice(0, Math.max(this.colors.length - 2, 1));
    return normalColors[index % normalColors.length] || '#edf1f3';
  }
}
