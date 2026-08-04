import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import type { EChartsCoreOption } from 'echarts';

import { ThemeColorService } from '../../services/theme-color.service';
import { LineChartComponent, LineChartSeriesItem } from '../line-chart/line-chart.component';

/** 一个模型在连续时间桶中的调用数量。 */
export interface ModelCallTrendSeries {
  model: string;
  totalRequests: number;
  data: number[];
}

@Component({
  selector: 'app-model-call-trend-chart',
  templateUrl: './model-call-trend-chart.component.html',
  styleUrls: ['./model-call-trend-chart.component.less'],
  imports: [LineChartComponent],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelCallTrendChartComponent {
  private readonly themeColor = inject(ThemeColorService);

  @Input() title = '模型调用趋势';
  @Input() subtitle = '对比不同模型在同一时间窗口内的调用变化';
  @Input() periodLabel = '';
  @Input() height = 280;
  @Input() loading = false;
  @Input() emptyText = '当前时间范围内暂无模型调用';
  @Input() labels: string[] = [];
  @Input() series: ModelCallTrendSeries[] = [];

  protected get displaySeries(): ModelCallTrendSeries[] {
    return this.series.slice(0, 6);
  }

  protected get totalRequests(): number {
    return this.displaySeries.reduce((total, item) => total + Number(item.totalRequests || 0), 0);
  }

  protected get topModelLabel(): string {
    return this.displaySeries[0]?.model || '-';
  }

  protected get palette(): string[] {
    const dark = this.themeColor.effectiveMode() === 'dark';
    return [
      this.themeColor.current().primary,
      dark ? '#4fc6a4' : '#14856e',
      dark ? '#e3a94f' : '#b7791f',
      dark ? '#7aa2f7' : '#315c85',
      dark ? '#c094d4' : '#7f4d97',
      dark ? '#98a5b3' : '#697684',
    ];
  }

  protected get chartSeries(): LineChartSeriesItem[] {
    const colors = this.palette;
    return this.displaySeries.map((item, index) => ({
      name: item.model,
      data: item.data,
      color: colors[index % colors.length],
      lineWidth: item.model === '其他' ? 1.75 : index === 0 ? 2.75 : 2.1,
      lineType: item.model === '其他' ? 'dashed' : 'solid',
      showSymbol: false,
      smooth: true,
      z: this.displaySeries.length - index,
    }));
  }

  protected readonly formatAxisRequests = (value: number): string => this.formatCompact(value);

  protected readonly formatTooltip = (params: unknown): string => {
    const rows = Array.isArray(params) ? params : [params];
    const first = rows[0] as { axisValueLabel?: string; name?: string } | undefined;
    const title = this.escapeHtml(first?.axisValueLabel || first?.name || '-');
    const body = rows
      .map((item: unknown) => {
        const row = item as { marker?: string; seriesName?: string; value?: number };
        return `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:7px">${row.marker || ''}<span style="flex:1">${this.escapeHtml(row.seriesName || '')}</span><strong>${this.formatNumber(row.value)} 次</strong></div>`;
      })
      .join('');
    return `<div style="min-width:200px"><strong>${title}</strong>${body}</div>`;
  };

  protected get chartOptions(): EChartsCoreOption {
    return {
      aria: {
        enabled: true,
        decal: { show: true },
        description: `${this.title}，对比不同模型的调用次数变化。`,
      },
      animationDuration: 420,
    };
  }

  protected formatCompact(value?: number): string {
    const count = Number(value || 0);
    if (Math.abs(count) >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (Math.abs(count) >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return Math.round(count).toLocaleString('zh-CN');
  }

  private formatNumber(value?: number): string {
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
