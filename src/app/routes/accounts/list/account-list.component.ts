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
import { SHARED_IMPORTS, TitleLabelComponent, formatMetricCurrency } from '@shared';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTagModule } from 'ng-zorro-antd/tag';
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
  imports: [
    SHARED_IMPORTS,
    TitleLabelComponent,
    NgClass,
    NzListModule,
    NzPaginationModule,
    NzTagModule,
  ],
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

  protected detail(item: Account): void {
    this.router.navigate(['/accounts/detail', item.guid]);
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
      .subscribe((result) => {
        item.resetCredits = result;
        if (result.availableCount <= 0) {
          this.message.info('该账号当前没有可用额度重置券');
        } else if (result.applicableAvailableCount === 0) {
          this.message.info(`查询到 ${result.availableCount} 张重置券，当前没有可重置的额度窗口`);
        } else {
          this.message.success(`查询到 ${result.availableCount} 张可用额度重置券`);
        }
        this.cdr.markForCheck();
      });
  }

  protected resetCreditHint(item: Account): string {
    const summary = item.resetCredits;
    if (!this.hasQueriedResetCredits(item)) {
      if (summary?.availableCount) {
        return `额度快照显示持有 ${summary.availableCount} 张，查询后可查看有效期`;
      }
      return '查询官方可用数量和到期时间';
    }
    if (!summary) return '查询官方可用数量和到期时间';
    if (summary.availableCount <= 0) return '账号当前没有可用额度重置券';
    if (summary.applicableAvailableCount === 0) {
      return `持有 ${summary.availableCount} 张，当前没有符合条件的限额窗口`;
    }
    if (summary.applicableAvailableCount != null) {
      return `持有 ${summary.availableCount} 张，可用于当前限额 ${summary.applicableAvailableCount} 张`;
    }
    return `持有 ${summary.availableCount} 张可用额度重置券`;
  }

  protected hasQueriedResetCredits(item: Account): boolean {
    return Number(item.resetCredits?.syncedAt || 0) > 0;
  }

  protected canConsumeResetCredit(item: Account): boolean {
    const summary = item.resetCredits;
    return Boolean(
      this.hasQueriedResetCredits(item) &&
      summary &&
      summary.availableCount > 0 &&
      summary.applicableAvailableCount !== 0,
    );
  }

  protected availableResetCredits(result: AccountResetCreditsResult): AccountResetCredit[] {
    return [...(result.credits || [])]
      .filter((credit) => !credit.status || credit.status.toLowerCase() === 'available')
      .sort((left, right) => {
        if (!left.expiresAt) return 1;
        if (!right.expiresAt) return -1;
        return left.expiresAt - right.expiresAt;
      });
  }

  protected resetCreditExpiry(result: AccountResetCreditsResult): number {
    return result.expiresAt || this.preferredResetCredit(result.credits)?.expiresAt || 0;
  }

  protected resetCreditTitle(credit: AccountResetCredit): string {
    const title = credit.title?.trim();
    if (!title) return '额度重置券';
    const titleMap: Record<string, string> = {
      'full reset': '完整重置',
    };
    return titleMap[title.toLowerCase()] || title;
  }

  protected confirmResetCredit(item: Account, result: AccountResetCreditsResult): void {
    if (result.availableCount <= 0) {
      this.message.info('该账号当前没有可用额度重置券');
      return;
    }
    if (result.applicableAvailableCount === 0) {
      this.message.info('账号持有重置券，但当前没有符合条件的限额窗口');
      item.resetCredits = result;
      this.cdr.markForCheck();
      return;
    }
    const credit = this.preferredResetCredit(result.credits);
    const expiry = credit?.expiresAt ? `，有效期至 ${this.formatTime(credit.expiresAt)}` : '';
    const detail = result.detailsAvailable
      ? `将消耗 1 张${credit?.title ? `“${this.resetCreditTitle(credit)}”` : '额度重置券'}${expiry}。`
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
            if (result.resetCredits) {
              item.resetCredits = result.resetCredits;
              this.cdr.markForCheck();
            }
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
    return this.availableResetCredits({ credits } as AccountResetCreditsResult)[0];
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

  protected accountKindLabel(item: Account): string {
    if (this.isImageAPIAccount(item)) return 'OpenAI 图片 API';
    if (item.credentialType === 'oauth') return 'Codex OAuth';
    if (item.credentialType === 'api_key') return 'API Key';
    return item.credentialType || item.productCode || '未知';
  }

  protected accountPlanLabel(item: Account): string {
    if (this.isImageAPIAccount(item)) return 'API 计费';
    const plan = this.normalizedAccountPlan(item);
    const labels: Record<string, string> = {
      free: 'Free',
      plus: 'Plus',
      pro: 'Pro',
      team: 'Team',
      business: 'Business',
      enterprise: 'Enterprise',
      edu: 'Edu',
    };
    return labels[plan] || plan || '未知套餐';
  }

  protected accountPlanColor(item: Account): string {
    if (this.isImageAPIAccount(item)) return 'blue';
    const plan = this.normalizedAccountPlan(item);
    const colors: Record<string, string> = {
      plus: 'gold',
      pro: 'volcano',
      team: 'purple',
      business: 'geekblue',
      enterprise: 'magenta',
      edu: 'cyan',
    };
    return colors[plan] || 'default';
  }

  private normalizedAccountPlan(item: Account): string {
    const planType = this.normalizePlanValue(item.planType);
    const subscriptionPlan = this.normalizePlanValue(item.subscriptionPlan);
    const knownPlans = ['free', 'plus', 'pro', 'team', 'business', 'enterprise', 'edu'];
    const plans = [planType, subscriptionPlan];

    // 订阅接口和历史账号文件可能分别写入 planType/subscriptionPlan，优先采用
    // 能识别的套餐，避免 planType=chatgpt 时把 Plus 账号误判成未知套餐。
    return (
      plans.find((plan) => plan === 'plus' || plan === 'pro') ||
      plans.find((plan) => knownPlans.includes(plan)) ||
      planType ||
      subscriptionPlan
    );
  }

  private normalizePlanValue(value?: string): string {
    const normalized = (value || '')
      .trim()
      .toLowerCase()
      .replace(/^chatgpt[\s_-]*/, '')
      .replace(/[\s-]+/g, '_');
    const compact = normalized.replace(/_/g, '');
    const planAlias = compact.match(
      /^(?:chatgpt)?(free|plus|pro|team|business|enterprise|edu)(?:plan)?$/,
    );
    if (planAlias) return planAlias[1];
    const knownPlan = normalized.match(
      /(?:^|[_-])(free|plus|pro|team|business|enterprise|edu)(?:$|[_-])/,
    );
    return knownPlan?.[1] || normalized;
  }

  protected isPlusAccount(item: Account): boolean {
    return !this.isImageAPIAccount(item) && this.normalizedAccountPlan(item) === 'plus';
  }

  protected isProAccount(item: Account): boolean {
    return !this.isImageAPIAccount(item) && this.normalizedAccountPlan(item) === 'pro';
  }

  /**
   * Plus 账号固定展示两个官方窗口；Pro 账号按官方规则只展示 7 天窗口。
   * 其他套餐仅在服务端确实返回 5 小时窗口时展示，避免凭空增加空白卡片。
   */
  protected shouldShowFiveHourQuota(item: Account): boolean {
    if (this.isImageAPIAccount(item) || this.isProAccount(item)) return false;
    return this.isPlusAccount(item) || Boolean(this.officialFiveHourQuota(item.quotas));
  }

  protected officialQuotaWindows(item: Account): Array<{
    key: '5h' | '7d';
    label: string;
    emptyLabel: string;
    quota: AccountQuota | null;
  }> {
    const windows: Array<{
      key: '5h' | '7d';
      label: string;
      emptyLabel: string;
      quota: AccountQuota | null;
    }> = [];
    if (this.shouldShowFiveHourQuota(item)) {
      windows.push({
        key: '5h',
        label: '5 小时窗口',
        emptyLabel: '暂无 5 小时官方额度',
        quota: this.officialFiveHourQuota(item),
      });
    }
    windows.push({
      key: '7d',
      label: '7 天窗口',
      emptyLabel: '暂无 7 天官方额度',
      quota: this.officialSevenDayQuota(item),
    });
    return windows;
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
    if (this.hasQuotaUsage(quota)) {
      const remaining = 100 - Math.min(100, Math.max(0, Number(quota.usedPercent)));
      if (remaining <= 20) return 'quota-danger';
      if (remaining <= 40) return 'quota-warning';
    }
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
    const rawUsedPercent = quota.usedPercent;
    const usedPercent = Number(rawUsedPercent);
    const hasWindowUsage =
      rawUsedPercent !== null && rawUsedPercent !== undefined && Number.isFinite(usedPercent);

    // `allowed` and `limitReached` are group-level fields in the official
    // /wham/usage response. A concrete usage value belongs to this window,
    // so it must take precedence over those legacy group flags regardless of
    // whether the raw snapshot is still available.
    if (hasWindowUsage) return usedPercent >= 99.5;
    if (quota.status === 'exhausted') return true;
    return quota.limitReached === true || quota.allowed === false;
  }

  protected quotaUsedPercent(quota: AccountQuota): number {
    if (this.isQuotaExhausted(quota)) return 100;
    const usedPercent = Number(quota.usedPercent);
    return Number.isFinite(usedPercent) ? Math.round(Math.min(100, Math.max(0, usedPercent))) : 0;
  }

  /**
   * 官方有时只返回窗口的重置时间和状态，不返回已用比例。
   * 这不是 0%，不能把缺失值伪装成“剩余 100%”。
   */
  protected hasQuotaUsage(quota: AccountQuota): boolean {
    const value = Number(quota.usedPercent);
    return quota.usedPercent !== null && quota.usedPercent !== undefined && Number.isFinite(value);
  }

  protected shouldRenderQuotaProgress(quota: AccountQuota): boolean {
    return this.hasQuotaUsage(quota) || this.isQuotaExhausted(quota);
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

  protected officialSevenDayQuota(itemOrQuotas?: Account | AccountQuota[]): AccountQuota | null {
    const item = Array.isArray(itemOrQuotas) ? undefined : itemOrQuotas;
    const quotas = Array.isArray(itemOrQuotas) ? itemOrQuotas : item?.quotas;
    return this.findOfficialQuota(quotas, '7d', item);
  }

  protected officialFiveHourQuota(itemOrQuotas?: Account | AccountQuota[]): AccountQuota | null {
    const item = Array.isArray(itemOrQuotas) ? undefined : itemOrQuotas;
    const quotas = Array.isArray(itemOrQuotas) ? itemOrQuotas : item?.quotas;
    return this.findOfficialQuota(quotas, '5h', item);
  }

  private findOfficialQuota(
    quotas: AccountQuota[] | undefined,
    window: '5h' | '7d',
    item?: Account,
  ): AccountQuota | null {
    const expectedSeconds = window === '5h' ? 5 * 60 * 60 : 7 * 24 * 60 * 60;
    const isPro = Boolean(item && this.isProAccount(item));
    const candidates = (quotas || []).flatMap((quota) => {
      if ((quota.source || '').trim().toLowerCase() !== 'wham') return [];
      const windowType = (quota.windowType || '').trim().toLowerCase();
      const seconds = Number(quota.limitWindowSeconds || 0);
      const isAdditional = windowType.includes(':');
      const hasKnownDuration = seconds > 0;
      const durationMatches =
        seconds === expectedSeconds ||
        (window === '7d' && seconds >= 6 * 24 * 60 * 60) ||
        (window === '5h' && seconds > 0 && seconds <= 6 * 60 * 60);

      // Main `rate_limit` rows are authoritative. Additional rows (Spark,
      // Code Review, ...) can also have a 7-day window, but must not replace
      // the account's own Pro/Plus quota merely because they were synced later.
      let rank: number | null = null;
      if (!isAdditional && windowType === window) {
        rank = 0;
      } else if (!isAdditional && hasKnownDuration && durationMatches) {
        rank = 1;
      } else if (!isAdditional && !hasKnownDuration) {
        if (window === '5h' && (windowType === 'primary' || windowType === 'primary_window'))
          rank = 2;
        if (window === '7d' && (windowType === 'secondary' || windowType === 'secondary_window'))
          rank = 2;
        // Pro accounts may expose only one unlabelled primary window. The
        // official endpoint uses it for the weekly Pro quota after the plan
        // change; prefer it over an additional feature's 7-day window.
        if (
          window === '7d' &&
          isPro &&
          (windowType === 'primary' || windowType === 'primary_window')
        )
          rank = 3;
      }

      const semanticAlias =
        (window === '5h' && /(?:^|[:_-])(?:5hour|5hours|fivehour|five_hours)$/.test(windowType)) ||
        (window === '7d' &&
          /(?:^|[:_-])(?:7day|7days|sevenday|seven_days|weekly|week|weekly_window|week_window)$/.test(
            windowType,
          ));
      if (rank === null && semanticAlias) rank = isAdditional ? 4 : 2;
      if (rank === null && isAdditional && durationMatches) rank = 4;
      if (rank === null) return [];
      return [{ quota, rank }];
    });
    if (!candidates.length) return null;
    return [...candidates].sort(
      (left, right) => left.rank - right.rank || right.quota.lastSyncedAt - left.quota.lastSyncedAt,
    )[0].quota;
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

  protected formatGatewayCost(item: Account): string {
    if (this.isImageAPIAccount(item)) return '--';
    return formatMetricCurrency(item.gatewayUsage?.costAmount);
  }

  protected gatewayCostTooltip(item: Account): string {
    if (this.isImageAPIAccount(item)) return '图片生成请求暂未纳入 Token 参考成本估算';
    const usage = item.gatewayUsage;
    if (usage && usage.priceableRequests > usage.pricedRequests) {
      return `已累计 ${usage.pricedRequests}/${usage.priceableRequests} 条匹配官方定价的请求；未配置模型定价的请求已忽略`;
    }
    return '根据近 30 天网关 Token 用量与官方 API 参考价估算，不代表上游实际账单';
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
