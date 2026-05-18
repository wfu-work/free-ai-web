import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { finalize } from 'rxjs';

import { AccountHealthItem, AccountQuota } from '../account.model';
import { AccountsService } from '../accounts.service';

@Component({
  selector: 'app-account-health',
  templateUrl: './account-health.component.html',
  styleUrls: ['./account-health.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountHealthComponent implements OnInit {
  private readonly accountsService = inject(AccountsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected items: AccountHealthItem[] = [];
  protected loading = false;

  protected readonly statusTag: STColumnTag = {
    available: { text: '可用', color: 'green' },
    limited: { text: '限流', color: 'orange' },
    cooldown: { text: '冷却', color: 'gold' },
    exhausted: { text: '耗尽', color: 'red' },
    disabled: { text: '禁用', color: 'default' },
    expired: { text: '过期', color: 'red' },
    invalid: { text: '失效', color: 'red' },
    unknown: { text: '未知', color: 'default' },
  };

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly columns: Array<STColumn<AccountHealthItem>> = [
    { title: '账号', index: 'name', render: 'nameRender', width: 200 },
    { title: 'Provider / 分组', index: 'provider', render: 'providerRender', width: 160 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 92 },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 86 },
    { title: '失败次数', index: 'failureCount', width: 92 },
    { title: '额度窗口', render: 'quotaRender', width: 280 },
    { title: '冷却 / 过期', render: 'cooldownRender', width: 190 },
    { title: '最近使用', render: 'activityRender', width: 180 },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.accountsService
      .health()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((items) => {
        this.items = items ?? [];
      });
  }

  protected get healthyCount(): number {
    return this.items.filter((item) => item.enabled && item.status === 'available').length;
  }

  protected get limitedCount(): number {
    return this.items.filter((item) => item.status === 'limited').length;
  }

  protected get cooldownCount(): number {
    return this.items.filter(
      (item) => item.status === 'cooldown' || Boolean(item.cooldownUntil && item.cooldownUntil > Date.now()),
    ).length;
  }

  protected get abnormalCount(): number {
    return this.items.filter((item) =>
      ['exhausted', 'disabled', 'expired', 'invalid', 'unknown'].includes(item.status),
    ).length;
  }

  protected quotaSummary(quotas: AccountQuota[]): string {
    if (!quotas?.length) return '无额度数据';
    return `${quotas.length} 个窗口`;
  }

  protected quotaTone(quota: AccountQuota): string {
    switch (quota.status) {
      case 'available':
        return 'quota-success';
      case 'limited':
        return 'quota-warning';
      case 'exhausted':
        return 'quota-danger';
      default:
        return '';
    }
  }

  protected quotaPercent(quota: AccountQuota): string {
    return `${Number(quota.usedPercent || 0).toFixed(0)}%`;
  }

  protected formatTokens(value?: number): string {
    const count = Number(value || 0);
    if (!count) return '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return `${count}`;
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
