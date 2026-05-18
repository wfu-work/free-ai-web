import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize, forkJoin } from 'rxjs';

import { RequestLog, OpsStats } from '../../request-logs/request-log.model';
import { RequestLogsService } from '../../request-logs/request-logs.service';

const DEFAULT_RETENTION_DAYS = 30;

@Component({
  selector: 'app-settings-retention',
  templateUrl: './settings-retention.component.html',
  styleUrls: ['./settings-retention.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SettingsRetentionComponent implements OnInit {
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = false;
  protected stats: OpsStats = { total: 0, success: 0, failures: 0, avgLatencyMs: 0 };
  protected logs: RequestLog[] = [];
  protected lastAction = '未执行';

  protected readonly retentionForm = this.fb.nonNullable.group({
    retentionDays: [DEFAULT_RETENTION_DAYS, [Validators.required]],
    before: [0],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      stats: this.requestLogsService.stats(),
      logs: this.requestLogsService.list(200),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ stats, logs }) => {
        this.stats = stats ?? this.stats;
        this.logs = logs ?? [];
      });
  }

  protected clearByRetention(): void {
    const days = Math.max(Number(this.retentionForm.controls.retentionDays.value || DEFAULT_RETENTION_DAYS), 1);
    this.modal.confirm({
      nzTitle: `确定清理 ${days} 天前的请求日志？`,
      nzContent: '清理操作不可恢复，建议确认已经完成必要的问题追踪。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.requestLogsService.clearByRetention(days).subscribe({
            next: () => {
              this.lastAction = `已按 ${days} 天保留策略清理`;
              this.message.success('请求日志已清理');
              this.load();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected clearBefore(): void {
    const before = Number(this.retentionForm.controls.before.value || 0);
    if (!before) {
      this.message.warning('请先填写 before 时间戳');
      return;
    }
    this.modal.confirm({
      nzTitle: '确定按时间戳清理请求日志？',
      nzContent: `将删除 ${before} 之前的全部请求日志。`,
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.requestLogsService.clearBefore(before).subscribe({
            next: () => {
              this.lastAction = `已按 before=${before} 清理`;
              this.message.success('请求日志已清理');
              this.load();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected get defaultRetentionLabel(): string {
    return `${DEFAULT_RETENTION_DAYS} 天`;
  }

  protected get sampleSize(): number {
    return this.logs.length;
  }

  protected get latestLogTime(): string {
    const latest = this.logs.reduce((max, item) => Math.max(max, item.createdAtUnix || 0), 0);
    return this.formatTime(latest);
  }

  protected get oldestLogTime(): string {
    const oldest = this.logs.reduce((min, item) => {
      if (!item.createdAtUnix) return min;
      if (!min) return item.createdAtUnix;
      return Math.min(min, item.createdAtUnix);
    }, 0);
    return this.formatTime(oldest);
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
}
