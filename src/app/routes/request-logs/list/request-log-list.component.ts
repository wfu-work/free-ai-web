import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { forkJoin, finalize } from 'rxjs';

import { OpsStats, RequestLog } from '../request-log.model';
import { RequestLogsService } from '../request-logs.service';

@Component({
  selector: 'app-request-log-list',
  templateUrl: './request-log-list.component.html',
  styleUrls: ['./request-log-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class RequestLogListComponent implements OnInit {
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  q = {
    page: 1,
    size: 10,
    provider: '',
    model: '',
    content: '',
  };

  protected data: RequestLog[] = [];
  protected stats: OpsStats = { total: 0, success: 0, failures: 0, avgLatencyMs: 0 };
  protected loading = false;
  totalCount = 0;
  protected detailVisible = false;
  protected detailLoading = false;
  protected detailRecord: RequestLog | null = null;

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

  protected readonly switchTag: STColumnTag = {
    true: { text: '已切换', color: 'gold' },
    false: { text: '未切换', color: 'default' },
  };

  protected readonly columns: Array<STColumn<RequestLog>> = [
    { title: '请求', index: 'requestId', render: 'requestRender', width: 230 },
    { title: '模型', index: 'model', render: 'modelRender', width: 210 },
    { title: '供应商', index: 'provider', render: 'providerRender', width: 140 },
    { title: '状态码', index: 'statusCode', type: 'tag', tag: this.statusTag, width: 88 },
    { title: '错误类型', index: 'errorType', render: 'errorRender', width: 150 },
    { title: '切换', index: 'switched', type: 'tag', tag: this.switchTag, width: 96 },
    { title: '延迟', index: 'latencyMs', render: 'latencyRender', width: 120 },
    { title: 'Token', index: 'inputTokens', render: 'tokenRender', width: 120 },
    { title: '时间', index: 'createdAtUnix', render: 'timeRender', width: 170 },
    {
      title: '操作',
      width: 80,
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
        this.stats = stats ?? { total: 0, success: 0, failures: 0, avgLatencyMs: 0 };
      });
  }

  protected resetFilters(): void {
    this.q.page = 1;
    this.q.provider = '';
    this.q.model = '';
    this.q.content = '';
    this.getData();
  }

  protected detail(item: RequestLog): void {
    this.detailVisible = true;
    this.detailLoading = true;
    this.detailRecord = item;
    this.requestLogsService
      .get(item.guid)
      .pipe(
        finalize(() => {
          this.detailLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((detail) => {
        this.detailRecord = detail;
      });
  }

  protected closeDetail(): void {
    this.detailVisible = false;
    this.detailRecord = null;
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
    if (!this.stats.total) return '--';
    return `${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`;
  }

  protected get providerOptions(): string[] {
    return Array.from(new Set(this.data.map((item) => item.provider).filter(Boolean))).sort();
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

  protected tokenTotal(item: RequestLog): number {
    return Number(item.inputTokens || 0) + Number(item.outputTokens || 0);
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
