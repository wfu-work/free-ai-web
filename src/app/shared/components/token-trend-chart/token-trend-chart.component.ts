import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import type { EChartsCoreOption } from 'echarts';

import { ThemeColorService } from '../../services/theme-color.service';
import { formatCompactMetric } from '../../utils/metric.util';
import { LineChartComponent, LineChartSeriesItem } from '../line-chart/line-chart.component';

/** Token 趋势图的标准时间点，缓存 Token 是输入 Token 的子集。 */
export interface TokenTrendPoint {
  label: string;
  timestamp?: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

@Component({
  selector: 'app-token-trend-chart',
  templateUrl: './token-trend-chart.component.html',
  styleUrls: ['./token-trend-chart.component.less'],
  imports: [LineChartComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokenTrendChartComponent {
  private readonly themeColor = inject(ThemeColorService);

  @Input() title = 'Token 趋势';
  @Input() subtitle = '输入、输出与缓存命中的时间变化';
  @Input() periodLabel = '';
  @Input() height = 300;
  @Input() loading = false;
  @Input() emptyText = '当前时间范围内暂无 Token 数据';
  @Input() variant: 'default' | 'compact' = 'default';
  @Input() points: TokenTrendPoint[] = [];

  protected get totalTokens(): number {
    return this.points.reduce(
      (total, point) => total + Number(point.inputTokens || 0) + Number(point.outputTokens || 0),
      0,
    );
  }

  protected get totalInputTokens(): number {
    return this.sum('inputTokens');
  }

  protected get totalOutputTokens(): number {
    return this.sum('outputTokens');
  }

  protected get totalCachedTokens(): number {
    return this.sum('cachedTokens');
  }

  protected get palette(): string[] {
    const dark = this.themeColor.effectiveMode() === 'dark';
    return [
      this.themeColor.current().primary,
      dark ? '#4fc6a4' : '#14856e',
      dark ? '#e3a94f' : '#b7791f',
    ];
  }

  protected get xAxisData(): string[] {
    return this.points.map((point) => point.label);
  }

  protected get series(): LineChartSeriesItem[] {
    const palette = this.palette;
    return [
      {
        name: '输入 Token',
        data: this.points.map((point) => Number(point.inputTokens || 0)),
        color: palette[0],
        area: true,
        lineWidth: 2.5,
        z: 3,
      },
      {
        name: '输出 Token',
        data: this.points.map((point) => Number(point.outputTokens || 0)),
        color: palette[1],
        lineWidth: 2.25,
        z: 4,
      },
      {
        name: '缓存命中',
        data: this.points.map((point) => Number(point.cachedTokens || 0)),
        color: palette[2],
        lineWidth: 2,
        z: 2,
      },
    ];
  }

  protected readonly formatAxisTokens = (value: number): string => this.formatCompact(value);

  protected readonly formatTooltip = (params: unknown): string => {
    const rows = Array.isArray(params) ? params : [params];
    const first = rows[0] as { axisValueLabel?: string; name?: string } | undefined;
    const title = this.escapeHtml(first?.axisValueLabel || first?.name || '-');
    const body = rows
      .map((item: unknown) => {
        const row = item as { marker?: string; seriesName?: string; value?: number };
        const exactValue = this.escapeHtml(this.formatNumber(row.value));
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:7px">${row.marker || ''}<span style="flex:1">${this.escapeHtml(row.seriesName || '')}</span><strong title="${exactValue}">${this.formatCompact(row.value)}</strong></div>`;
      })
      .join('');
    return `<div style="min-width:190px"><strong>${title}</strong>${body}</div>`;
  };

  protected get chartOptions(): EChartsCoreOption {
    return {
      aria: {
        enabled: true,
        decal: { show: false },
        description: `${this.title}，展示输入、输出与缓存命中 Token 的变化。`,
      },
      animationDuration: 420,
    };
  }

  protected formatCompact(value?: number): string {
    return formatCompactMetric(value);
  }

  private sum(key: 'inputTokens' | 'outputTokens' | 'cachedTokens'): number {
    return this.points.reduce((total, point) => total + Number(point[key] || 0), 0);
  }

  protected formatNumber(value?: number): string {
    return Math.round(Number(value || 0)).toLocaleString('zh-CN');
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ||
        character,
    );
  }
}
