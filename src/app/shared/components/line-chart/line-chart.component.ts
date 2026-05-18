import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ECharts, EChartsCoreOption, SeriesOption } from 'echarts';
import * as echarts from 'echarts';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

export interface LineChartSeriesItem {
  name: string;
  data: Array<number | string | Date | [string | number | Date, number | null] | null>;
  color?: string;
  smooth?: boolean;
  area?: boolean;
  showSymbol?: boolean;
  symbol?: string;
  yAxisIndex?: number;
  stack?: string;
  lineWidth?: number;
  markPoint?: SeriesOption['markPoint'];
  markLine?: SeriesOption['markLine'];
  z?: number;
}

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.less'],
  imports: [CommonModule, NzEmptyModule, NzSpinModule, NzIconModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartRef', { static: false }) chartRef?: ElementRef<HTMLDivElement>;

  @Input() title = '';
  @Input() subtitle = '';
  @Input() height = 360;
  @Input() loading = false;
  @Input() emptyText = '暂无折线图数据';
  @Input() unit = '';
  @Input() xAxisType: 'category' | 'time' | 'value' = 'category';
  @Input() xAxisData: Array<string | number | Date> = [];
  @Input() series: LineChartSeriesItem[] = [];
  @Input() colors: string[] = ['#3448f4', '#6fa7ff', '#b8b5ff', '#fa8c16', '#13c2c2', '#722ed1'];
  @Input() yAxisName = '';
  @Input() xAxisName = '';
  @Input() yAxisMin?: number;
  @Input() yAxisMax?: number;
  @Input() legend = true;
  @Input() showArea = false;
  @Input() showToolbox = false;
  @Input() extraOptions?: EChartsCoreOption;
  @Input() tooltipFormatter?: (params: any) => string;
  @Input() xAxisLabelFormatter?: ((value: string | number) => string) | string;
  @Input() yAxisLabelFormatter?: ((value: number) => string) | string;
  @Input() titleAlign: 'left' | 'center' = 'center';
  @Input() legendAlign: 'left' | 'center' | 'right' = 'center';
  @Input() gridLeft = 16;
  @Input() gridRight = 64;
  @Input() gridBottom = 18;

  protected chart?: ECharts;
  protected chartReady = false;

  private resizeObserver?: ResizeObserver;

  protected get hasData(): boolean {
    return this.series.some(
      (item) =>
        Array.isArray(item.data) &&
        item.data.some((point) => {
          if (point === null) return false;
          if (Array.isArray(point)) return Number.isFinite(Number(point[1]));
          return Number.isFinite(Number(point));
        }),
    );
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.bindResize();
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['series'] ||
      changes['xAxisData'] ||
      changes['xAxisType'] ||
      changes['title'] ||
      changes['subtitle'] ||
      changes['unit'] ||
      changes['legend'] ||
      changes['showArea'] ||
      changes['showToolbox'] ||
      changes['yAxisName'] ||
      changes['xAxisName'] ||
      changes['yAxisMin'] ||
      changes['yAxisMax'] ||
      changes['colors'] ||
      changes['extraOptions'] ||
      changes['tooltipFormatter'] ||
      changes['xAxisLabelFormatter'] ||
      changes['yAxisLabelFormatter'] ||
      changes['titleAlign'] ||
      changes['legendAlign'] ||
      changes['gridLeft'] ||
      changes['gridRight'] ||
      changes['gridBottom']
    ) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  protected retryRender(): void {
    this.renderChart();
  }

  private initChart(): void {
    const element = this.chartRef?.nativeElement;
    if (!element || this.chart) {
      return;
    }

    this.chart = echarts.init(element);
    this.chartReady = true;
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

    const option = this.buildOptions();
    this.chart.setOption(option, true);
    this.chart.resize();
  }

  private buildOptions(): EChartsCoreOption {
    const legendNames = this.series.map((item) => item.name);
    const categoryAxisData = this.resolveCategoryAxisData();

    return {
      color: this.colors,
      animationDuration: 500,
      animationEasing: 'cubicOut',
      title: this.title
        ? {
            text: this.title,
            subtext: this.subtitle,
            left: '50%',
            top: 0,
            textAlign: this.titleAlign,
            textStyle: {
              color: '#1d2c28',
              fontSize: 18,
              fontWeight: 700,
            },
            subtextStyle: {
              color: '#8a9c96',
              fontSize: 12,
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        formatter: this.tooltipFormatter,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: 'rgba(18,71,50,0.08)',
        borderWidth: 1,
        textStyle: {
          color: '#31423b',
        },
        padding: [10, 12],
        extraCssText: 'box-shadow: 0 10px 24px rgba(15,52,38,0.08); border-radius: 12px;',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: 'rgba(11,140,94,0.24)',
            width: 1,
          },
        },
      },
      legend: this.legend
        ? {
            top: this.title ? 38 : 0,
            left:
              this.legendAlign === 'center'
                ? 'center'
                : this.legendAlign === 'left'
                  ? 0
                  : undefined,
            right: this.legendAlign === 'right' ? 0 : undefined,
            itemWidth: 10,
            itemHeight: 10,
            textStyle: {
              color: '#61756e',
              fontSize: 12,
            },
            data: legendNames,
          }
        : undefined,
      toolbox: this.showToolbox
        ? {
            right: 0,
            feature: {
              saveAsImage: {
                title: '保存图片',
              },
            },
          }
        : undefined,
      grid: {
        left: this.gridLeft,
        right: this.gridRight,
        top: this.title ? 84 : this.legend ? 36 : 20,
        bottom: this.gridBottom,
        containLabel: true,
      },
      xAxis: {
        type: this.xAxisType,
        name: this.xAxisName,
        nameTextStyle: {
          color: '#7f928b',
        },
        boundaryGap: this.xAxisType === 'category',
        data: this.xAxisType === 'category' ? categoryAxisData : undefined,
        axisLine: {
          lineStyle: {
            color: 'rgba(18,71,50,0.12)',
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: '#7f928b',
          fontSize: 12,
          formatter: this.xAxisLabelFormatter,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        name: this.yAxisName || this.unit,
        min: this.yAxisMin,
        max: this.yAxisMax,
        nameTextStyle: {
          color: '#7f928b',
          padding: [0, 0, 4, 0],
        },
        axisLabel: {
          color: '#7f928b',
          fontSize: 12,
          formatter:
            this.yAxisLabelFormatter ||
            ((value: number) => `${value}${this.unit ? ` ${this.unit}` : ''}`),
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(18,71,50,0.08)',
            type: 'dashed',
          },
        },
      },
      series: this.series.map((item, index) => ({
        name: item.name,
        type: 'line',
        smooth: item.smooth ?? true,
        showSymbol: item.showSymbol ?? false,
        symbol: item.symbol ?? 'circle',
        yAxisIndex: item.yAxisIndex ?? 0,
        stack: item.stack,
        lineStyle: {
          width: item.lineWidth ?? 3,
          color: item.color || this.colors[index % this.colors.length],
        },
        itemStyle: {
          color: item.color || this.colors[index % this.colors.length],
        },
        areaStyle:
          (item.area ?? this.showArea)
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  {
                    offset: 0,
                    color: this.withAlpha(
                      item.color || this.colors[index % this.colors.length],
                      0.26,
                    ),
                  },
                  {
                    offset: 1,
                    color: this.withAlpha(
                      item.color || this.colors[index % this.colors.length],
                      0.02,
                    ),
                  },
                ]),
              }
            : undefined,
        emphasis: {
          focus: 'series',
        },
        markPoint: item.markPoint,
        markLine: item.markLine,
        z: item.z,
        data: this.resolveSeriesData(item.data, categoryAxisData),
      })),
      ...this.extraOptions,
    };
  }

  private resolveCategoryAxisData(): Array<string | number | Date> {
    if (this.xAxisType !== 'category') {
      return [];
    }
    if (this.xAxisData.length) {
      return this.xAxisData;
    }

    const seen = new Set<string>();
    const values: Array<string | number | Date> = [];
    for (const seriesItem of this.series) {
      for (const point of seriesItem.data) {
        if (!Array.isArray(point)) continue;
        const axis = point[0];
        const key = String(axis);
        if (seen.has(key)) continue;
        seen.add(key);
        values.push(axis);
      }
    }
    return values;
  }

  private resolveSeriesData(
    data: Array<number | string | Date | [string | number | Date, number | null] | null>,
    categoryAxisData: Array<string | number | Date>,
  ): Array<number | string | Date | [string | number | Date, number | null] | null> {
    if (this.xAxisType !== 'category') {
      return data;
    }

    const hasTuple = data.some((item) => Array.isArray(item));
    if (hasTuple) {
      const valueByAxis = new Map<string, number | null>();
      for (const item of data) {
        if (!Array.isArray(item)) continue;
        valueByAxis.set(String(item[0]), item[1]);
      }
      return categoryAxisData.map((axis) => valueByAxis.get(String(axis)) ?? null);
    }

    return categoryAxisData.map((_, index) => (data[index] as number | null) ?? null);
  }

  private withAlpha(color: string, alpha: number): string {
    const hex = color.replace('#', '');
    if (![3, 6].includes(hex.length)) {
      return color;
    }

    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => `${char}${char}`)
            .join('')
        : hex;
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}
