import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { ModelMapping } from '../../models/model.model';
import { ModelsService } from '../../models/models.service';
import { Account, AccountQuota, AccountTestResult } from '../account.model';
import { AccountsService } from '../accounts.service';

@Component({
  selector: 'app-account-list',
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly modelsService = inject(ModelsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  q = {
    page: 1,
    size: 10,
    enabled: '',
    content: '',
  };

  protected data: Account[] = [];
  protected loading = false;
  totalCount = 0;
  protected testVisible = false;
  protected testing = false;
  protected testTarget: Account | null = null;
  protected testResult: AccountTestResult | null = null;
  protected modelMappings: ModelMapping[] = [];
  protected testModelOptions: string[] = [];
  protected testModelSource: 'account' | 'global' | 'empty' = 'empty';

  protected readonly testForm = this.fb.nonNullable.group({
    model: [''],
    prompt: ['ping'],
  });

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
    upstream_5xx: '上游服务错误',
    network_error: '网络错误',
    model_not_supported: '模型不支持',
    no_available_account: '无可用账号',
  };

  protected readonly columns: Array<STColumn<Account>> = [
    { title: '账号', index: 'name', render: 'nameRender', width: 200, fixed: 'left' },
    { title: '供应商 / 分组', index: 'provider', render: 'providerRender', width: 150 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 92 },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 86 },
    { title: '权重', index: 'weight', render: 'weightRender', width: 92 },
    { title: '失败', index: 'failureCount', width: 72 },
    { title: '额度窗口', render: 'quotaRender', width: 280 },
    { title: '最近使用', index: 'lastUsedAt', render: 'lastUsedRender', width: 170 },
    { title: 'Secret', index: 'secretHint', render: 'secretRender', width: 180 },
    {
      title: '操作',
      width: 230,
      fixed: 'right',
      buttons: [
        {
          text: '编辑',
          click: (item: Account) => this.edit(item),
        },
        {
          text: '测试',
          click: (item: Account) => this.openTest(item),
        },
        {
          text: '刷新',
          click: (item: Account) => this.refresh(item),
        },
        {
          text: '启用',
          click: (item: Account) => this.setEnabled(item, true),
          iif: (item: Account) => !item.enabled,
          pop: {
            title: '确定启用?',
            okType: 'danger',
            icon: 'star',
          },
        },
        {
          text: '禁用',
          className: 'text-error',
          click: (item: Account) => this.setEnabled(item, false),
          iif: (item: Account) => item.enabled,
          pop: {
            title: '确定禁用?',
            okType: 'danger',
            icon: 'star',
          },
        },
        {
          text: '删除',
          className: 'text-error',
          click: (item: Account) => this.delete(item),
          pop: {
            title: '确定删除?',
            okType: 'danger',
            icon: 'star',
          },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadModelMappings();
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
    this.accountsService.refresh(item.guid).subscribe(() => {
      this.message.success('账号状态已刷新');
      this.getData();
    });
  }

  protected delete(item: Account): void {
    this.modal.confirm({
      nzTitle: '确定删除该账号？',
      nzContent: '删除后账号 Secret 和路由能力将不可恢复，请确认没有模型映射仍依赖它。',
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
    this.syncTestModelOptions(item);
    this.testForm.reset({ model: this.testModelOptions[0] || '', prompt: 'ping' });
    this.testVisible = true;
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
      .test(this.testTarget.guid, this.testForm.getRawValue())
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

  protected errorText(errorType?: string): string {
    const value = (errorType || '').trim();
    if (!value) return '-';
    return this.errorTextMap[value] || value;
  }

  protected modeText(mode?: string): string {
    return mode === 'upstream' ? '上游请求' : '基础检查';
  }

  protected get testModelExtra(): string {
    switch (this.testModelSource) {
      case 'account':
        return '当前账号已配置支持模型，测试时优先使用账号设置的模型。';
      case 'global':
        return '当前账号未单独设置模型，测试时使用全局模型映射。';
      default:
        return '暂无可选模型，留空只检查 Secret 解密和账号基础状态。';
    }
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
    if (totalAmount > 0 && (remainingAmount <= 0 || usedPercent >= 99.5)) return true;
    return totalTokens > 0 && (remainingTokens <= 0 || usedPercent >= 99.5);
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
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  protected modelCount(value?: string): string {
    if (!value) return '未限制';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return `${parsed.length} 个模型`;
    } catch {
      return '自定义';
    }
    return '自定义';
  }

  protected firstSupportedModel(value?: string): string {
    return this.parseModelList(value)[0] || '';
  }

  private loadModelMappings(): void {
    this.modelsService.listAll().subscribe({
      next: (models) => {
        this.modelMappings = models ?? [];
        if (this.testTarget) {
          this.syncTestModelOptions(this.testTarget);
          if (!this.testModelOptions.includes(this.testForm.controls.model.value)) {
            this.testForm.controls.model.setValue(this.testModelOptions[0] || '');
          }
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.modelMappings = [];
      },
    });
  }

  private syncTestModelOptions(account: Account): void {
    const accountModels = this.parseModelList(account.supportedModels);
    if (accountModels.length) {
      this.testModelOptions = accountModels;
      this.testModelSource = 'account';
      return;
    }

    this.testModelOptions = Array.from(
      new Set(
        this.modelMappings
          .filter((item) => item.enabled !== false && !item.provider && !item.accountGroup)
          .flatMap((item) => [item.publicModel, ...this.parseModelList(item.aliases)])
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
    this.testModelSource = this.testModelOptions.length ? 'global' : 'empty';
  }

  private parseModelList(value?: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
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
