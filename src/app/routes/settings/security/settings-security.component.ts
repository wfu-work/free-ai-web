import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { finalize } from 'rxjs';

import { MasterKeyStatus } from '../../ops/ops.model';
import { OpsService } from '../../ops/ops.service';

@Component({
  selector: 'app-settings-security',
  templateUrl: './settings-security.component.html',
  styleUrls: ['./settings-security.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SettingsSecurityComponent implements OnInit {
  private readonly opsService = inject(OpsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected masterKey: MasterKeyStatus | null = null;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.opsService
      .masterKey()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((status) => {
        this.masterKey = status ?? null;
      });
  }

  protected get statusLabel(): string {
    if (!this.masterKey) return '--';
    if (this.masterKey.loaded) return '已加载';
    if (this.masterKey.exists) return '文件异常';
    return '不存在';
  }

  protected get statusTone(): string {
    if (!this.masterKey) return '';
    if (this.masterKey.loaded) return 'metric-success';
    if (this.masterKey.exists) return 'metric-warning';
    return 'metric-danger';
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

  protected formatBytes(value?: number): string {
    const size = Number(value || 0);
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
}
