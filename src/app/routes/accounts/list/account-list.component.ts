import { NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { finalize } from 'rxjs';

import { OFFICIAL_VENDOR_OPTIONS, normalizeOfficialVendorCode } from '../account-options';
import {
  Account,
  AccountQuota,
  AccountResetCredit,
  AccountResetCreditsResult,
  AccountTestResult,
} from '../account.model';
import { AccountsService } from '../accounts.service';

@Component({
  selector: 'app-account-list',
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, NgClass, NzListModule, NzPaginationModule],
})
export class AccountListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  q = {
    page: 1,
    size: 10,
    enabled: '',
    vendorCode: '',
    content: '',
  };

  protected data: Account[] = [];
  protected loading = false;
  totalCount = 0;
  protected testVisible = false;
  protected testing = false;
  protected testModelsLoading = false;
  protected testTarget: Account | null = null;
  protected testResult: AccountTestResult | null = null;
  protected testModelOptions: string[] = [];
  protected testModelSource: 'account' | 'empty' = 'empty';
  protected resetCreditLoadingGuid = '';
  protected readonly officialVendorOptions = OFFICIAL_VENDOR_OPTIONS;

  protected readonly testForm = this.fb.nonNullable.group({
    model: [''],
    prompt: ['ping'],
  });

  protected readonly quotaProgressFormat = (percent: number): string =>
    `剩余 ${Number(percent || 0).toFixed(0)}%`;

  private readonly statusTextMap: Record<string, string> = {
    available: '可用',
    limited: '限流',
    cooldown: '冷却',
    exhausted: '耗尽',
    disabled: '禁用',
    expired: '过期',
    invalid: '失效',
    unknown: '未知',
  };

  private readonly errorTextMap: Record<string, string> = {
    auth_failed: '认证失败',
    rate_limited: '限流',
    quota_exhausted: '额度耗尽',
    upstream_timeout: '上游超时',
    upstream_http_4xx: '上游请求错误',
    upstream_http_5xx: '上游服务错误',
    upstream_failed: '上游响应失败',
    upstream_5xx: '上游服务错误',
    stream_incomplete: '响应流不完整',
    client_disconnected: '客户端已断开',
    protocol_error: '协议解析错误',
    network_error: '网络错误',
    internal_error: '网关内部错误',
    model_not_supported: '模型不支持',
    no_available_account: '无可用账号',
  };

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.accountsService
      .list(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((r) => {
        this.data = r.data ?? [];
        this.totalCount = r.total ?? 0;
      });
  }

  protected add(): void {
    this.router.navigateByUrl('/accounts/edit');
  }

  protected edit(item: Account): void {
    this.router.navigate(['/accounts/edit', item.guid]);
  }

  protected setEnabled(item: Account, enabled: boolean): void {
    const title = enabled ? '确定启用该账号？' : '确定禁用该账号？';
    this.modal.confirm({
      nzTitle: title,
      nzContent: enabled ? '启用后账号会重新参与模型路由。' : '禁用后该账号不会再被代理路由命中。',
      nzOkType: enabled ? 'primary' : 'default',
      nzOnOk: () => {
        const request = enabled
          ? this.accountsService.enable(item.guid)
          : this.accountsService.disable(item.guid);
        return new Promise<void>((resolve, reject) => {
          request.subscribe({
            next: () => {
              this.message.success(enabled ? '账号已启用' : '账号已禁用');
              this.getData();
              resolve();
            },
            error: reject,
          });
        });
      },
    });
  }

  protected refresh(item: Account): void {
    this.accountsService.refreshUsage(item.guid).subscribe(() => {
      this.message.success(
        this.isImageAPIAccount(item) ? 'API Key 验证通过，图片模型已同步' : '账号状态已刷新',
      );
      this.getData();
    });
  }

  protected inspectResetCredits(item: Account): void {
    if (this.resetCreditLoadingGuid) return;
    this.resetCreditLoadingGuid = item.guid;
    this.accountsService
      .resetCredits(item.guid)
      .pipe(
        finalize(() => {
          this.resetCreditLoadingGuid = '';
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => this.confirmResetCredit(item, result));
  }

  protected resetCreditActionText(item: Account): string {
    const summary = item.resetCredits;
    if (!summary) return '查询重置券';
    if (summary.availableCount <= 0) return '暂无重置券';
    if (summary.applicableAvailableCount === 0) return '当前无需重置';
    return '使用重置券';
  }

  protected resetCreditHint(item: Account): string {
    const summary = item.resetCredits;
    if (!summary) return '同步额度后可查询官方重置券';
    if (summary.availableCount <= 0) return '账号当前没有可用额度重置券';
    if (summary.applicableAvailableCount === 0) {
      return `持有 ${summary.availableCount} 张，当前没有符合条件的限额窗口`;
    }
    if (summary.applicableAvailableCount != null) {
      return `持有 ${summary.availableCount} 张，可用于当前限额 ${summary.applicableAvailableCount} 张`;
    }
    return `持有 ${summary.availableCount} 张，点击查询可用状态`;
  }

  protected canInspectResetCredits(item: Account): boolean {
    const summary = item.resetCredits;
    return !summary || (summary.availableCount > 0 && summary.applicableAvailableCount !== 0);
  }

  private confirmResetCredit(item: Account, result: AccountResetCreditsResult): void {
    if (result.availableCount <= 0) {
      this.message.info('该账号当前没有可用额度重置券');
      return;
    }
    if (result.applicableAvailableCount === 0) {
      this.message.info('账号持有重置券，但当前没有符合条件的限额窗口');
      this.updateResetCreditSummary(item, result);
      return;
    }
    const credit = this.preferredResetCredit(result.credits);
    const expiry = credit?.expiresAt ? `，有效期至 ${this.formatTime(credit.expiresAt)}` : '';
    const detail = result.detailsAvailable
      ? `将消耗 1 张${credit?.title ? `“${credit.title}”` : '额度重置券'}${expiry}。`
      : '官方仅返回可用数量，将由官方自动选择一张额度重置券。';
    this.modal.confirm({
      nzTitle: `使用 ${item.name || item.email} 的额度重置券？`,
      nzContent: `${detail} 操作成功后系统会立即同步额度；重置券一经使用不可撤销。`,
      nzOkText: '确认使用',
      nzOkType: 'primary',
      nzOnOk: () => this.consumeResetCredit(item, credit),
    });
  }

  private consumeResetCredit(item: Account, credit?: AccountResetCredit): Promise<void> {
    const idempotencyKey = crypto.randomUUID();
    this.resetCreditLoadingGuid = item.guid;
    this.cdr.markForCheck();
    return new Promise<void>((resolve, reject) => {
      this.accountsService
        .consumeResetCredit(item.guid, { idempotencyKey, creditId: credit?.id })
        .pipe(
          finalize(() => {
            this.resetCreditLoadingGuid = '';
            this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: (result) => {
            switch (result.outcome) {
              case 'reset':
                this.message.success('额度重置成功，账号状态已重新同步');
                break;
              case 'alreadyRedeemed':
                this.message.success('该操作此前已完成，账号状态已重新同步');
                break;
              case 'nothingToReset':
                this.message.info('当前没有符合条件的额度窗口，无需消耗重置券');
                break;
              case 'noCredit':
                this.message.warning('该账号没有可用额度重置券');
                break;
              default:
                this.message.warning(`官方返回了未识别结果：${result.outcome}`);
            }
            if (result.refreshWarning) {
              this.message.warning(`额度已处理，但同步状态失败：${result.refreshWarning}`);
            }
            this.getData();
            resolve();
          },
          error: reject,
        });
    });
  }

  private preferredResetCredit(credits: AccountResetCredit[]): AccountResetCredit | undefined {
    return [...(credits || [])]
      .filter((credit) => !credit.status || credit.status === 'available')
      .sort((left, right) => {
        if (!left.expiresAt) return 1;
        if (!right.expiresAt) return -1;
        return left.expiresAt - right.expiresAt;
      })[0];
  }

  private updateResetCreditSummary(item: Account, result: AccountResetCreditsResult): void {
    item.resetCredits = {
      availableCount: result.availableCount,
      applicableAvailableCount: result.applicableAvailableCount,
    };
    this.cdr.markForCheck();
  }

  protected delete(item: Account): void {
    this.modal.confirm({
      nzTitle: '确定删除该账号？',
      nzContent: '删除后加密凭据、模型可用关系和额度快照将不可恢复，请确认不再使用该账号。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.accountsService.delete(item.guid).subscribe({
            next: () => {
              this.message.success('账号已删除');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected openTest(item: Account): void {
    this.testTarget = item;
    this.testResult = null;
    this.testModelOptions = [];
    this.testModelSource = 'empty';
    this.testForm.reset({ model: '', prompt: this.isImageAPIAccount(item) ? '' : 'ping' });
    this.testVisible = true;
    this.testModelsLoading = true;
    this.accountsService
      .fetchModels({ guid: item.guid })
      .pipe(
        finalize(() => {
          this.testModelsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.testModelOptions = Array.from(new Set((result.models || []).filter(Boolean)));
        this.testModelSource = this.testModelOptions.length ? 'account' : 'empty';
        this.testForm.controls.model.setValue(this.testModelOptions[0] || '');
      });
  }

  protected closeTest(): void {
    this.testVisible = false;
    this.testing = false;
    this.testTarget = null;
    this.testResult = null;
  }

  protected runTest(): void {
    if (!this.testTarget) return;
    this.testing = true;
    this.testResult = null;
    this.accountsService
      .probe(this.testTarget.guid, this.testForm.getRawValue())
      .pipe(
        finalize(() => {
          this.testing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.testResult = result;
        if (result.ok) {
          this.message.success('账号测试通过');
        } else {
          this.message.warning('账号测试未通过，请查看结果');
        }
        this.getData();
      });
  }

  protected statusText(status?: string): string {
    const value = (status || '').trim();
    if (!value) return '-';
    return this.statusTextMap[value] || value;
  }

  protected statusTone(status?: string): string {
    switch ((status || '').trim()) {
      case 'available':
        return 'status-success';
      case 'limited':
      case 'cooldown':
        return 'status-warning';
      case 'exhausted':
      case 'expired':
      case 'invalid':
        return 'status-danger';
      default:
        return 'status-neutral';
    }
  }

  protected tokenStatusText(status?: string): string {
    const statusMap: Record<string, string> = {
      active: '有效',
      refresh_needed: '需要刷新',
      refresh_failed: '刷新失败',
      invalid: '无效',
    };
    const value = (status || '').trim();
    return statusMap[value] || value || '-';
  }

  protected vendorLabel(vendorCode?: string): string {
    const value = normalizeOfficialVendorCode(vendorCode);
    return this.officialVendorOptions.find((item) => item.value === value)?.label || 'OpenAI';
  }

  protected accountTypeLabel(item: Account): string {
    return this.isImageAPIAccount(item) ? '图片 API' : this.vendorLabel(item.vendorCode);
  }

  protected isImageAPIAccount(item?: Account | null): boolean {
    return item?.productCode === 'openai_images';
  }

  protected vendorMark(vendorCode?: string): string {
    switch (normalizeOfficialVendorCode(vendorCode)) {
      case 'openai':
        return 'AI';
      case 'google':
        return 'G';
      case 'anthropic':
        return 'C';
    }
  }

  protected vendorCardClass(vendorCode?: string): string {
    return `vendor-${normalizeOfficialVendorCode(vendorCode)}`;
  }

  protected accountCardClasses(item: Account): string[] {
    const classes = [this.vendorCardClass(item.vendorCode)];
    if (!item.enabled) {
      classes.push('account-card-disabled');
      return classes;
    }
    switch ((item.status || '').trim()) {
      case 'limited':
      case 'cooldown':
        classes.push('account-card-waiting');
        break;
      case 'exhausted':
      case 'expired':
      case 'invalid':
        classes.push('account-card-unavailable');
        break;
    }
    return classes;
  }

  protected errorText(errorType?: string): string {
    const value = (errorType || '').trim();
    if (!value) return '-';
    return this.errorTextMap[value] || value;
  }

  protected get testModelExtra(): string {
    if (this.isImageAPIAccount(this.testTarget)) {
      return this.testModelSource === 'account'
        ? '验证只检查 API Key 与图片模型访问权限，不会实际生成图片或产生生成费用。'
        : '该 API Key 未返回可用图片模型，请检查 Platform 项目权限和计费状态。';
    }
    switch (this.testModelSource) {
      case 'account':
        return '模型来自该账号刚刚同步的官方模型目录。';
      default:
        return '暂无可选模型；主动探测前请先获取该账号的官方模型清单。';
    }
  }

  protected quotaTone(quota: AccountQuota): string {
    if (this.isQuotaExhausted(quota)) return 'quota-danger';
    const remaining = 100 - Math.min(100, Math.max(0, Number(quota.usedPercent || 0)));
    if (remaining <= 20) return 'quota-danger';
    if (remaining <= 40) return 'quota-warning';
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
    if (quota.status === 'exhausted') return true;
    return quota.limitReached === true || quota.allowed === false || usedPercent >= 99.5;
  }

  protected quotaUsedPercent(quota: AccountQuota): number {
    if (this.isQuotaExhausted(quota)) return 100;
    return Math.round(Math.min(100, Math.max(0, Number(quota.usedPercent || 0))));
  }

  protected quotaRemainingPercent(quota: AccountQuota): number {
    return 100 - this.quotaUsedPercent(quota);
  }

  protected quotaProgressColor(quota: AccountQuota): string {
    const remaining = this.quotaRemainingPercent(quota);
    if (remaining <= 20) return '#d84a4a';
    if (remaining <= 40) return '#d89614';
    return '#20a77a';
  }

  protected officialSevenDayQuota(quotas?: AccountQuota[]): AccountQuota | null {
    return (
      (quotas || []).find((quota) => {
        const source = (quota.source || '').trim().toLowerCase();
        const windowType = (quota.windowType || '').trim().toLowerCase();
        return source === 'wham' && (windowType === '7d' || windowType.endsWith(':7d'));
      }) ?? null
    );
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

  protected modelCount(value?: number): string {
    return `${Number(value || 0)} 个模型`;
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

  protected exportAccount(item: Account): void {
    if (this.isImageAPIAccount(item)) return;
    this.modal.confirm({
      nzTitle: '导出敏感 OAuth 账号文件？',
      nzContent: '文件包含 access_token 和 refresh_token，只能保存到可信位置。',
      nzOkText: '确认导出',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.accountsService.exportAccount(item.guid).subscribe({
            next: (blob) => {
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `${item.chatgptAccountId || item.guid}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected pageIndexChange(page: number): void {
    if (page === this.q.page) return;
    this.q.page = page;
    this.getData();
  }

  protected pageSizeChange(size: number): void {
    if (size === this.q.size) return;
    this.q.size = size;
    this.q.page = 1;
    this.getData();
  }
}
