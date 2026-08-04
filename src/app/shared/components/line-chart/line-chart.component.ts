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
  effect,
  inject,
} from '@angular/core';
import type { ECharts, EChartsCoreOption, SeriesOption } from 'echarts';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import { ThemeColorService } from '../../services/theme-color.service';

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
  lineType?: 'solid' | 'dashed' | 'dotted';
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

  private readonly themeColor = inject(ThemeColorService);

  @Input() title = '';
  @Input() subtitle = '';
  @Input() height = 360;
  @Input() loading = false;
  @Input() emptyText = '暂无折线图数据';
  @Input() unit = '';
  @Input() xAxisType: 'category' | 'time' | 'value' = 'category';
  @Input() xAxisData: Array<string | number | Date> = [];
  @Input() series: LineChartSeriesItem[] = [];
  @Input() colors: string[] = [];
  @Input() yAxisName = '';
  @Input() xAxisName = '';
  @Input() yAxisMin?: number;
  @Input() yAxisMax?: number;
  @Input() legend = true;
  @Input() showArea = false;
  @Input() showToolbox = false;
  @Input() extraOptions?: EChartsCoreOption;
  @Input() tooltipFormatter?: (params: unknown) => string;
  @Input() xAxisLabelFormatter?: ((value: string | number) => string) | string;
  @Input() yAxisLabelFormatter?: ((value: number) => string) | string;
  @Input() titleAlign: 'left' | 'center' = 'center';
  @Input() legendAlign: 'left' | 'center' | 'right' = 'center';
  @Input() gridLeft = 16;
  @Input() gridRight = 64;
  @Input() gridBottom = 18;

  protected chart?: ECharts;
  protected chartReady = false;

  private echarts?: typeof import('echarts');
  private chartLoad?: Promise<void>;
  private destroyed = false;
  private resizeObserver?: ResizeObserver;

  constructor() {
    effect(() => {
      this.themeColor.current();
      this.themeColor.effectiveMode();
      queueMicrotask(() => void this.renderChart());
    });
  }

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
    this.bindResize();
    void this.renderChart();
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
      void this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  protected retryRender(): void {
    void this.renderChart();
  }

  private async initChart(): Promise<void> {
    const element = this.chartRef?.nativeElement;
    if (!element || this.chart) {
      return;
    }

    this.chartLoad ??= import('echarts').then((module) => {
      if (this.destroyed || this.chart || !element.isConnected) return;
      this.echarts = module;
      this.chart = module.init(element);
      this.chartReady = true;
    });
    await this.chartLoad;
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

  private async renderChart(): Promise<void> {
    if (!this.chartRef?.nativeElement) {
      return;
    }

    await this.initChart();
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
    const theme = this.resolveTheme();
    const palette = this.colors.length
      ? this.colors
      : [theme.primary, theme.success, theme.warning, theme.info];

    return {
      color: palette,
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
              color: theme.text,
              fontSize: 18,
              fontWeight: 700,
            },
            subtextStyle: {
              color: theme.textSecondary,
              fontSize: 12,
            },
          }
        : undefined,
      tooltip: {
        trigger: 'axis',
        formatter: this.tooltipFormatter,
        backgroundColor: theme.surface,
        borderColor: theme.border,
        borderWidth: 1,
        textStyle: {
          color: theme.text,
        },
        padding: [10, 12],
        extraCssText: `box-shadow: ${theme.tooltipShadow}; border-radius: 8px;`,
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: theme.pointer,
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
              color: theme.textSecondary,
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
          color: theme.textSecondary,
        },
        boundaryGap: this.xAxisType === 'category',
        data: this.xAxisType === 'category' ? categoryAxisData : undefined,
        axisLine: {
          lineStyle: {
            color: theme.border,
          },
        },
        axisTick: {
          show: false,
        },
        axisLabel: {
          color: theme.textSecondary,
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
          color: theme.textSecondary,
          padding: [0, 0, 4, 0],
        },
        axisLabel: {
          color: theme.textSecondary,
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
            color: theme.grid,
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
          type: item.lineType ?? 'solid',
          color: item.color || palette[index % palette.length],
        },
        itemStyle: {
          color: item.color || palette[index % palette.length],
        },
        areaStyle:
          (item.area ?? this.showArea)
            ? {
                color: new this.echarts!.graphic.LinearGradient(0, 0, 0, 1, [
                  {
                    offset: 0,
                    color: this.withAlpha(item.color || palette[index % palette.length], 0.26),
                  },
                  {
                    offset: 1,
                    color: this.withAlpha(item.color || palette[index % palette.length], 0.02),
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

  private resolveTheme(): {
    primary: string;
    success: string;
    warning: string;
    info: string;
    text: string;
    textSecondary: string;
    surface: string;
    border: string;
    grid: string;
    pointer: string;
    tooltipShadow: string;
  } {
    const dark = this.themeColor.effectiveMode() === 'dark';
    const primary = this.themeColor.current().primary;
    return {
      primary,
      success: dark ? '#4fc6a4' : '#14856e',
      warning: dark ? '#e3a94f' : '#b7791f',
      info: dark ? '#7aa2f7' : '#315c85',
      text: dark ? '#e7edf4' : '#1f3148',
      textSecondary: dark ? '#9ca8b6' : '#697684',
      surface: dark ? '#18212c' : '#ffffff',
      border: dark ? '#334252' : '#dfe6ed',
      grid: dark ? '#283746' : '#e8edf2',
      pointer: dark ? '#60758a' : '#9bacbd',
      tooltipShadow: dark ? '0 12px 28px rgb(0 0 0 / 32%)' : '0 12px 28px rgb(31 49 72 / 12%)',
    };
  }
}
