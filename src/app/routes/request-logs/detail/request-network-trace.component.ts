import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';

import { requestLogErrorLabel } from '../request-log-error';
import { RequestNetworkTrace } from '../request-log.model';

@Component({
  selector: 'app-request-network-trace',
  templateUrl: './request-network-trace.component.html',
  styleUrl: './request-network-trace.component.less',
  imports: [SHARED_IMPORTS, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestNetworkTraceComponent {
  readonly trace = input<RequestNetworkTrace>();
  private readonly message = inject(NzMessageService);
  protected readonly errorLabel = requestLogErrorLabel;

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
