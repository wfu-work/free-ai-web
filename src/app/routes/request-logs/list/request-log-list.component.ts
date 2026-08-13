import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { MetricCardComponent, SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { forkJoin, finalize } from 'rxjs';

import { requestLogDiagnosticLabel, requestLogErrorLabel } from '../request-log-error';
import { OpsStats, RequestLog } from '../request-log.model';
import { RequestLogsService } from '../request-logs.service';

@Component({
  selector: 'app-request-log-list',
  templateUrl: './request-log-list.component.html',
  styleUrls: ['./request-log-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, MetricCardComponent],
})
export class RequestLogListComponent implements OnInit {
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  q = {
    page: 1,
    size: 10,
    model: '',
    content: '',
  };

  protected data: RequestLog[] = [];
  protected stats: OpsStats = {
    total: 0,
    success: 0,
    failures: 0,
    clientDisconnected: 0,
    avgLatencyMs: 0,
  };
  protected loading = false;
  totalCount = 0;

  protected readonly statusTag: STColumnTag = {
    200: { text: '200', color: 'green' },
    400: { text: '400', color: 'orange' },
    401: { text: '401', color: 'red' },
    403: { text: '403', color: 'red' },
    404: { text: '404', color: 'orange' },
    429: { text: '429', color: 'gold' },
    500: { text: '500', color: 'red' },
    502: { text: '502', color: 'red' },
    503: { text: '503', color: 'red' },
  };

  protected readonly columns: Array<STColumn<RequestLog>> = [
    { title: '时间', index: 'createdAtUnix', render: 'timeRender', width: 180, fixed: 'left' },
    { title: '类型 / 方法 / 路径', index: 'path', render: 'requestRender', width: 220 },
    { title: '账号 / 密钥', index: 'accountName', render: 'identityRender', width: 250 },
    { title: '模型 / 推理 / 等级', index: 'model', render: 'modelRender', width: 230 },
    { title: '状态', index: 'statusCode', type: 'tag', tag: this.statusTag, width: 95 },
    { title: '耗时', index: 'latencyMs', render: 'latencyRender', width: 190 },
    { title: 'Token / 成本', index: 'inputTokens', render: 'tokenRender', width: 180 },
    { title: '错误 / 诊断', index: 'errorType', render: 'errorRender', width: 220 },
    {
      title: '操作',
      width: 100,
      fixed: 'right',
      buttons: [
        {
          text: '详情',
          click: (item: RequestLog) => this.detail(item),
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    forkJoin({
      items: this.requestLogsService.pageList(this.q),
      stats: this.requestLogsService.stats(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ items, stats }) => {
        this.data = items.data ?? [];
        this.totalCount = items.total ?? 0;
        this.stats = stats ?? {
          total: 0,
          success: 0,
          failures: 0,
          clientDisconnected: 0,
          avgLatencyMs: 0,
        };
      });
  }

  protected resetFilters(): void {
    this.q.page = 1;
    this.q.model = '';
    this.q.content = '';
    this.getData();
  }

  protected detail(item: RequestLog): void {
    void this.router.navigate(['/request-logs/detail', item.guid]);
  }

  protected clearRetention(days: number): void {
    this.modal.confirm({
      nzTitle: `确定清理 ${days} 天前的请求日志？`,
      nzContent: '清理操作不可恢复，建议确认已经完成必要的问题追踪。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.requestLogsService.clearByRetention(days).subscribe({
            next: () => {
              this.message.success('请求日志已清理');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected get successRate(): string {
    const serviceRequests = Math.max(this.stats.total - this.stats.clientDisconnected, 0);
    if (!serviceRequests) return '--';
    return `${((this.stats.success / serviceRequests) * 100).toFixed(1)}%`;
  }

  protected get modelOptions(): string[] {
    return Array.from(new Set(this.data.map((item) => item.model).filter(Boolean))).sort();
  }

  protected get filteredCount(): number {
    return this.data.length;
  }

  protected isFailure(item: RequestLog): boolean {
    return item.statusCode >= 400 || Boolean(item.errorType);
  }

  protected errorLabel(errorType?: string): string {
    return requestLogErrorLabel(errorType);
  }

  protected diagnosticLabel(diagnosticType?: string): string {
    return requestLogDiagnosticLabel(diagnosticType);
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  protected formatMs(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '-';
    return `${Number(value).toFixed(0)} ms`;
  }

  protected formatLatencyChip(value?: number): string {
    const milliseconds = Number(value || 0);
    if (milliseconds <= 0) return '-';
    if (milliseconds < 1000) return `${Math.max(1, Math.round(milliseconds))}ms`;
    return `${(milliseconds / 1000).toFixed(1)}s`;
  }

  protected formatLatencyDetail(value?: number): string {
    const milliseconds = Number(value || 0);
    if (milliseconds <= 0) return '-';
    if (milliseconds < 1000) return `${Math.max(1, Math.round(milliseconds))} ms`;
    return `${(milliseconds / 1000).toFixed(1)} s`;
  }

  protected firstResponseMs(item: RequestLog): number {
    return Number(item.firstTokenMs || item.firstEventMs || 0);
  }

  protected upstreamDurationMs(item: RequestLog): number {
    return Math.max(Number(item.latencyMs || 0) - Number(item.preparationMs || 0), 0);
  }

  protected postTokenDurationMs(item: RequestLog): number {
    const firstTokenMs = Number(item.firstTokenMs || 0);
    if (!firstTokenMs) return 0;
    return Math.max(Number(item.latencyMs || 0) - firstTokenMs, 0);
  }

  protected latencyRateLabel(item: RequestLog): string {
    const durationMs = this.postTokenDurationMs(item);
    const outputTokens = Number(item.outputTokens || 0);
    if (durationMs <= 0 || outputTokens <= 0) return '流式响应';
    const rate = outputTokens / (durationMs / 1000);
    return `流 · ${Math.max(1, Math.round(rate))} t/s`;
  }

  protected connectionLabel(item: RequestLog): string {
    if (!item.connectionTraced) return '-';
    return item.connectionReused ? '已复用连接' : '新建连接';
  }

  protected networkStageLabel(value: number | undefined, item: RequestLog): string {
    if (Number(value || 0) > 0) return this.formatLatencyDetail(value);
    if (item.connectionTraced && item.connectionReused) return '复用连接';
    return '未发生或 < 1 ms';
  }

  protected forwardingAttempts(item: RequestLog): number {
    if (!item.accountGuid) return 0;
    return Math.max(Number(item.switchCount || 0) + 1, 1);
  }

  protected tokenTotal(item: RequestLog): number {
    return Number(item.inputTokens || 0) + Number(item.outputTokens || 0);
  }

  protected logTime(item: RequestLog): number | undefined {
    return item.createdAtUnix || item.createTime;
  }

  protected formatNumber(value?: number): string {
    return Number(value || 0).toLocaleString('zh-CN');
  }

  protected formatMoney(value?: number): string {
    return `$${Number(value || 0).toFixed(6)}`;
  }

  protected shortText(value?: string, fallback = '-'): string {
    const text = (value || '').trim();
    if (!text) return fallback;
    return text.length > 14 ? `${text.slice(0, 10)}...` : text;
  }

  protected requestMethod(item: RequestLog): string {
    return item.method || 'POST';
  }

  protected requestPath(item: RequestLog): string {
    return item.path || '/v1';
  }

  protected platformKeyTitle(item: RequestLog): string {
    return item.platformKey || item.keyPrefix || this.shortText(item.platformKeyId, '无API 密钥');
  }

  protected platformKeyMeta(item: RequestLog): string {
    if (item.platformKey && item.keyPrefix) return item.keyPrefix;
    return item.platformKeyId || item.keyPrefix || '-';
  }

  protected async copy(value: string, label: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success(`${label}已复制`);
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择文本');
    }
  }

  tableChange(event: STChange): void {
    switch (event.type) {
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.getData();
        break;
      default:
        break;
    }
  }
}
