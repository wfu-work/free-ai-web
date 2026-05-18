import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';

import {
  AccountSelectOption,
  DEFAULT_ACCOUNT_GROUP_OPTIONS,
  getAccountTypeLabel,
  getProviderLabel,
  mergeAccountTypeOptions,
  mergeProviderOptions,
  mergeStringOptions,
} from '../account-options';
import { Account, AccountPayload } from '../account.model';
import { AccountsService } from '../accounts.service';

type AccountFormMode = 'create' | 'edit';

@Component({
  selector: 'app-account-edit',
  templateUrl: './account-edit.component.html',
  styleUrls: ['./account-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = false;
  protected saving = false;
  protected formMode: AccountFormMode = 'create';
  protected accountGuid = '';
  protected account: Account | null = null;
  protected providerOptions: AccountSelectOption[] = mergeProviderOptions([]);
  protected accountGroupOptions = [...DEFAULT_ACCOUNT_GROUP_OPTIONS];
  protected accountTypeOptions: AccountSelectOption[] = mergeAccountTypeOptions([]);
  protected modelOptions: string[] = [];
  protected fetchingModels = false;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: [''],
    provider: ['openai', [Validators.required]],
    apiBaseUrl: [''],
    supplierName: [''],
    officialUrl: [''],
    accountType: [''],
    authType: ['bearer_token', [Validators.required]],
    secret: [''],
    supportedModels: [''],
    accountGroup: [''],
    priority: [0],
    weight: [1],
    subscriptionExpiredAt: [0],
    remark: [''],
  });

  ngOnInit(): void {
    this.form.controls.provider.valueChanges.subscribe(() => {
      this.syncCustomProviderValidators();
      this.cdr.markForCheck();
    });
    this.syncCustomProviderValidators();
    this.loadSelectOptions();
    const guid = this.route.snapshot.paramMap.get('guid');
    if (guid) {
      this.enterEditMode(guid);
      return;
    }
    this.enterCreateMode();
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload: AccountPayload = {
      ...value,
      apiBaseUrl: value.provider === 'custom' ? value.apiBaseUrl.trim() : '',
      supplierName: value.provider === 'custom' ? value.supplierName.trim() : '',
      officialUrl: value.provider === 'custom' ? value.officialUrl.trim() : '',
      supportedModels: value.supportedModels ? JSON.stringify([value.supportedModels]) : '',
      priority: Number(value.priority || 0),
      weight: Math.max(Number(value.weight || 1), 1),
      subscriptionExpiredAt: Number(value.subscriptionExpiredAt || 0),
    };

    if (this.formMode === 'edit' && !payload.secret) {
      delete payload.secret;
    }

    this.saving = true;
    const request =
      this.formMode === 'create'
        ? this.accountsService.create(payload)
        : this.accountsService.update(this.accountGuid, payload);

    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((account) => {
        this.account = account ?? this.account;
        this.message.success(this.formMode === 'create' ? '账号已创建' : '账号已更新');
        this.router.navigateByUrl('/accounts/list');
      });
  }

  protected goList(): void {
    this.router.navigateByUrl('/accounts/list');
  }

  protected get pageTitle(): string {
    return this.formMode === 'create' ? '新增账号' : '编辑账号';
  }

  protected get pageDescription(): string {
    return this.formMode === 'create'
      ? '创建新的上游 AI 账号，配置 Provider、认证方式、支持模型与调度优先级。'
      : '更新已有账号的 Provider、调度参数与 Secret；留空 Secret 表示继续使用当前值。';
  }

  protected get statusLabel(): string {
    return this.account?.status || (this.formMode === 'create' ? '待创建' : '--');
  }

  protected get enabledLabel(): string {
    if (this.formMode === 'create') return '创建后设置';
    return this.account?.enabled ? '已启用' : '已停用';
  }

  protected get secretHint(): string {
    if (this.formMode === 'create') return '创建后生成';
    return this.account?.secretHint || '未提供';
  }

  protected get authTypeLabel(): string {
    const authType = this.form.controls.authType.value;
    return authType === 'api_key' ? 'API Key' : 'Bearer Token';
  }

  protected get modelsLabel(): string {
    return this.form.controls.supportedModels.value || '未限制';
  }

  protected get scheduleLabel(): string {
    const priority = Number(this.form.controls.priority.value || 0);
    const weight = Math.max(Number(this.form.controls.weight.value || 1), 1);
    return `P${priority} / W${weight}`;
  }

  protected get secretPolicyLabel(): string {
    return this.formMode === 'create' ? '首次创建需填写' : '留空保留当前值';
  }

  protected get accountTypeLabel(): string {
    return getAccountTypeLabel(this.form.controls.accountType.value);
  }

  protected get providerLabel(): string {
    return getProviderLabel(this.form.controls.provider.value);
  }

  protected get isCustomProvider(): boolean {
    return this.form.controls.provider.value === 'custom';
  }

  protected fetchModels(): void {
    const value = this.form.getRawValue();
    if (this.isCustomProvider && !value.apiBaseUrl.trim()) {
      this.message.warning('请先填写 API 请求地址');
      return;
    }
    if (!value.secret.trim()) {
      this.message.warning('请先填写 Secret，拉取模型列表需要上游鉴权');
      return;
    }
    this.fetchingModels = true;
    this.accountsService
      .fetchModels({
        provider: value.provider,
        apiBaseUrl: value.apiBaseUrl,
        authType: value.authType,
        secret: value.secret,
      })
      .pipe(
        finalize(() => {
          this.fetchingModels = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.modelOptions = this.mergeModelOptions(result.models || []);
        if (!this.form.controls.supportedModels.value && this.modelOptions.length) {
          this.form.controls.supportedModels.setValue(this.modelOptions[0]);
        }
        this.message.success(`已获取 ${this.modelOptions.length} 个模型`);
      });
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

  private enterCreateMode(): void {
    const queryGroup = (this.route.snapshot.queryParamMap.get('group') || '').trim();
    this.mergeSelectOptions([], queryGroup ? [queryGroup] : [], []);
    this.formMode = 'create';
    this.accountGuid = '';
    this.account = null;
    this.modelOptions = [];
    this.form.reset({
      name: '',
      email: '',
      provider: 'openai',
      apiBaseUrl: '',
      supplierName: '',
      officialUrl: '',
      accountType: 'manual',
      authType: 'bearer_token',
      secret: '',
      supportedModels: '',
      accountGroup: queryGroup,
      priority: 0,
      weight: 1,
      subscriptionExpiredAt: 0,
      remark: '',
    });
    this.form.controls.secret.setValidators([Validators.required]);
    this.form.controls.secret.updateValueAndValidity();
    this.cdr.markForCheck();
  }

  private enterEditMode(guid: string): void {
    this.formMode = 'edit';
    this.accountGuid = guid;
    this.form.controls.secret.clearValidators();
    this.form.controls.secret.updateValueAndValidity();

    this.loading = true;
    this.accountsService
      .get(guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((account) => {
        this.account = account;
        this.mergeSelectOptions([account.provider], [account.accountGroup], [account.accountType]);
        this.modelOptions = this.mergeModelOptions([this.firstSupportedModel(account.supportedModels)]);
        this.form.reset({
          name: account.name ?? '',
          email: account.email ?? '',
          provider: account.provider ?? 'openai',
          apiBaseUrl: account.apiBaseUrl ?? '',
          supplierName: account.supplierName ?? '',
          officialUrl: account.officialUrl ?? '',
          accountType: account.accountType ?? '',
          authType: account.authType || 'bearer_token',
          secret: '',
          supportedModels: this.firstSupportedModel(account.supportedModels),
          accountGroup: account.accountGroup ?? '',
          priority: account.priority ?? 0,
          weight: account.weight || 1,
          subscriptionExpiredAt: account.subscriptionExpiredAt ?? 0,
          remark: account.remark ?? '',
        });
      });
  }

  private loadSelectOptions(): void {
    forkJoin({
      accounts: this.accountsService.list(),
      groups: this.accountsService.listGroups(),
    }).subscribe({
      next: ({ accounts, groups }) => {
        this.mergeSelectOptions(
          accounts.map((item) => item.provider),
          groups.filter((item) => item.enabled).map((item) => item.name),
          accounts.map((item) => item.accountType),
        );
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
  }

  private mergeSelectOptions(providers: string[], accountGroups: string[], accountTypes: string[]): void {
    this.providerOptions = mergeProviderOptions(providers);
    this.accountGroupOptions = mergeStringOptions(DEFAULT_ACCOUNT_GROUP_OPTIONS, accountGroups);
    this.accountTypeOptions = mergeAccountTypeOptions(accountTypes);
  }

  private firstSupportedModel(raw?: string): string {
    const value = (raw || '').trim();
    if (!value || value === '*') return '';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return String(parsed[0] || '');
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)[0] || '';
    }
    return value;
  }

  private mergeModelOptions(values: Array<string | null | undefined>): string[] {
    return Array.from(
      new Set(
        [...this.modelOptions, ...values]
          .map((item) => (item || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private syncCustomProviderValidators(): void {
    const controls = [
      this.form.controls.apiBaseUrl,
      this.form.controls.supplierName,
      this.form.controls.officialUrl,
    ];
    if (this.isCustomProvider) {
      controls.forEach((control) => control.setValidators([Validators.required]));
    } else {
      controls.forEach((control) => control.clearValidators());
    }
    controls.forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
  }
}
