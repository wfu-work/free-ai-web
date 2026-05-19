import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize, forkJoin } from 'rxjs';

import { CoreBackupImportResult } from '../../ops/ops.model';
import { OpsService } from '../../ops/ops.service';
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
  private readonly opsService = inject(OpsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  @ViewChild('backupFileInput') private backupFileInput?: ElementRef<HTMLInputElement>;

  protected loading = false;
  protected backupLoading = false;
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

  protected exportCoreBackup(): void {
    this.backupLoading = true;
    this.opsService
      .exportCoreBackup()
      .pipe(
        finalize(() => {
          this.backupLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (blob) => {
          const filename = `freeai-core-backup-${this.formatFilenameTime()}.json`;
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          anchor.click();
          URL.revokeObjectURL(url);
          this.lastAction = '已导出核心数据备份';
          this.message.success('核心数据备份已导出');
        },
        error: () => this.message.error('核心数据备份导出失败'),
      });
  }

  protected openImportFile(): void {
    this.backupFileInput?.nativeElement.click();
  }

  protected async handleBackupFileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.message.warning('请选择 JSON 格式的备份文件');
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      this.message.error('备份文件解析失败，请确认文件内容是有效 JSON');
      return;
    }
    if (!this.isCoreBackupPayload(payload)) {
      this.message.error('备份文件格式不正确，未发现 FreeAi 核心备份标识');
      return;
    }
    const summary = this.backupSummary(payload);
    this.modal.confirm({
      nzTitle: '确定导入并恢复核心数据？',
      nzContent: `将按 guid 恢复并覆盖同一份核心数据：${summary}。操作会写入后端数据库，请确认备份来源可信。`,
      nzOkText: '导入恢复',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.backupLoading = true;
          this.opsService
            .importCoreBackup(payload)
            .pipe(
              finalize(() => {
                this.backupLoading = false;
                this.cdr.markForCheck();
              }),
            )
            .subscribe({
              next: (result) => {
                this.lastAction = '已导入核心数据备份';
                this.message.success(`核心数据已恢复：${this.importResultLabel(result)}`);
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

  private isCoreBackupPayload(value: unknown): value is Record<string, any> {
    if (!value || typeof value !== 'object') return false;
    const payload = value as Record<string, any>;
    return payload['version'] === 'freeai-core-backup/v1' && payload['data'] && typeof payload['data'] === 'object';
  }

  private backupSummary(payload: Record<string, any>): string {
    const data = payload['data'] || {};
    const count = (key: string): number => (Array.isArray(data[key]) ? data[key].length : 0);
    return [
      `账号 ${count('accounts')}`,
      `分组 ${count('accountGroups')}`,
      `模型 ${count('modelMappings')}`,
      `平台密钥 ${count('platformKeys')}`,
      `额度 ${count('accountQuotas')}`,
      `路由状态 ${count('routeStates')}`,
    ].join('、');
  }

  private importResultLabel(result: CoreBackupImportResult): string {
    return [
      `账号 ${result.accounts || 0}`,
      `分组 ${result.accountGroups || 0}`,
      `模型 ${result.modelMappings || 0}`,
      `密钥 ${result.platformKeys || 0}`,
    ].join('、');
  }

  private formatFilenameTime(): string {
    const date = new Date();
    const pad = (value: number): string => `${value}`.padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      '-',
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('');
  }
}
