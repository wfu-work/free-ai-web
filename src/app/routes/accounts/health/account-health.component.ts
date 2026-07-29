import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { finalize } from 'rxjs';

import { AccountHealthItem, AccountQuota } from '../account.model';
import { AccountsService } from '../accounts.service';

const QUOTA_EXHAUSTED_PERCENT_THRESHOLD = 99.5;

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

  q = {
    page: 1,
    size: 10,
    enabled: '',
    content: '',
  };

  protected rawData: AccountHealthItem[] = [];
  protected data: AccountHealthItem[] = [];
  protected loading = false;
  totalCount = 0;

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
    { title: '账号', index: 'name', render: 'nameRender', width: 200, fixed: 'left' },
    { title: '供应商 / 分组', index: 'provider', render: 'providerRender', width: 160 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 92 },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 86 },
    { title: '失败次数', index: 'failureCount', width: 92 },
    { title: '额度窗口', render: 'quotaRender', width: 280 },
    { title: '下次检查', render: 'nextCheckRender', width: 150 },
    { title: '冷却 / 过期', render: 'cooldownRender', width: 190 },
    { title: '最近使用', render: 'activityRender', width: 180 },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
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
        this.rawData = items ?? [];
        this.applyTableFilters();
      });
  }

  protected get healthyCount(): number {
    return this.data.filter((item) => item.enabled && item.status === 'available').length;
  }

  protected get limitedCount(): number {
    return this.data.filter((item) => item.status === 'limited').length;
  }

  protected get cooldownCount(): number {
    return this.data.filter(
      (item) =>
        item.status === 'cooldown' ||
        Boolean(item.cooldownUntil && item.cooldownUntil > Date.now()),
    ).length;
  }

  protected get abnormalCount(): number {
    return this.data.filter((item) =>
      ['exhausted', 'disabled', 'expired', 'invalid', 'unknown'].includes(item.status),
    ).length;
  }

  protected usageQueryLabel(_item: AccountHealthItem): string {
    return '本地用量统计';
  }

  protected nextUsageCheckLabel(_item: AccountHealthItem): string {
    return '不查询官方余额';
  }

  protected quotaTone(quota: AccountQuota): string {
    if (this.isQuotaExhausted(quota)) return 'quota-danger';
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

  protected isQuotaExhausted(quota: AccountQuota): boolean {
    const usedPercent = Number(quota.usedPercent || 0);
    const totalAmount = Number(quota.totalAmount || 0);
    const remainingAmount = Number(quota.remainingAmount || 0);
    const totalTokens = Number(quota.totalTokens || 0);
    const remainingTokens = Number(quota.remainingTokens || 0);
    if (quota.status === 'exhausted') return true;
    if (
      totalAmount > 0 &&
      (remainingAmount <= 0 || usedPercent >= QUOTA_EXHAUSTED_PERCENT_THRESHOLD)
    )
      return true;
    return (
      totalTokens > 0 && (remainingTokens <= 0 || usedPercent >= QUOTA_EXHAUSTED_PERCENT_THRESHOLD)
    );
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

  protected formatQuotaValue(quota: AccountQuota): string {
    if (quota.unit === 'usd') {
      return `$${Number(quota.remainingAmount || 0).toFixed(2)}/$${Number(quota.totalAmount || 0).toFixed(2)}`;
    }
    return `${this.formatTokens(quota.remainingTokens)}/${this.formatTokens(quota.totalTokens)}`;
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

  protected applyTableFilters(): void {
    const enabled = this.q.enabled;
    const content = this.q.content.trim().toLowerCase();
    this.data = this.rawData.filter((item) => {
      if (enabled !== '' && Number(item.enabled) !== Number(enabled)) return false;
      if (!content) return true;
      return [
        item.name,
        item.guid,
        item.provider,
        item.supplierName,
        item.accountGroup,
        item.status,
        item.usageQueryType,
        this.nextUsageCheckLabel(item),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(content));
    });
    this.totalCount = this.data.length;
    this.cdr.markForCheck();
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
