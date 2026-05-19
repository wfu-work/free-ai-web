import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { RequestLog } from '../request-log.model';
import { RequestLogsService } from '../request-logs.service';

@Component({
  selector: 'app-request-log-detail',
  templateUrl: './request-log-detail.component.html',
  styleUrls: ['./request-log-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class RequestLogDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected record: RequestLog | null = null;

  ngOnInit(): void {
    const guid = this.route.snapshot.paramMap.get('guid');
    if (!guid) {
      this.goList();
      return;
    }
    this.loading = true;
    this.requestLogsService
      .get(guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((record) => {
        this.record = record;
      });
  }

  protected goList(): void {
    void this.router.navigate(['/request-logs/list']);
  }

  protected requestMethod(item: RequestLog): string {
    return item.method || 'POST';
  }

  protected requestPath(item: RequestLog): string {
    return item.path || '/v1';
  }

  protected tokenTotal(item: RequestLog): number {
    return Number(item.inputTokens || 0) + Number(item.outputTokens || 0);
  }

  protected logTime(item: RequestLog): number | undefined {
    return item.createdAtUnix || item.createTime;
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

  protected formatNumber(value?: number): string {
    return Number(value || 0).toLocaleString('zh-CN');
  }

  protected async copy(value: string | undefined, label: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success(`${label}已复制`);
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择文本');
    }
  }
}
