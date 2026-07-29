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
  getProviderLabel,
  mergeProviderOptions,
  mergeStringOptions,
} from '../../accounts/account-options';
import { Account } from '../../accounts/account.model';
import { AccountsService } from '../../accounts/accounts.service';
import { ModelMapping, ModelPayload } from '../model.model';
import { ModelsService } from '../models.service';

type ModelFormMode = 'create' | 'edit';

@Component({
  selector: 'app-model-edit',
  templateUrl: './model-edit.component.html',
  styleUrls: ['./model-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class ModelEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modelsService = inject(ModelsService);
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = false;
  protected saving = false;
  protected formMode: ModelFormMode = 'create';
  protected modelGuid = '';
  protected model: ModelMapping | null = null;
  protected providerOptions: AccountSelectOption[] = mergeProviderOptions([]);
  protected accountGroupOptions = [...DEFAULT_ACCOUNT_GROUP_OPTIONS];
  protected relatedAccounts: Account[] = [];
  protected upstreamModelOptions: string[] = [];

  protected readonly form = this.fb.nonNullable.group({
    publicModel: ['', [Validators.required]],
    aliases: [''],
    upstreamModel: ['', [Validators.required]],
    provider: ['openai', [Validators.required]],
    accountGroup: [''],
    stream: [true],
    timeoutSec: [120],
  });

  ngOnInit(): void {
    this.form.controls.provider.valueChanges.subscribe(() => this.syncUpstreamModelOptions());
    this.form.controls.accountGroup.valueChanges.subscribe(() => this.syncUpstreamModelOptions());
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
    const payload: ModelPayload = {
      ...value,
      provider: 'openai',
      accountGroup: value.accountGroup || '',
      timeoutSec: Math.max(Number(value.timeoutSec || 0), 1),
    };

    this.saving = true;
    const request =
      this.formMode === 'create'
        ? this.modelsService.create(payload)
        : this.modelsService.update(this.modelGuid, payload);

    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((model) => {
        this.model = model ?? this.model;
        this.message.success(this.formMode === 'create' ? '模型映射已创建' : '模型映射已更新');
        this.router.navigateByUrl('/models/list');
      });
  }

  protected goList(): void {
    this.router.navigateByUrl('/models/list');
  }

  protected get pageTitle(): string {
    return this.formMode === 'create' ? '新增模型映射' : '编辑模型映射';
  }

  protected get pageDescription(): string {
    return this.formMode === 'create'
      ? '配置对外模型、OpenAI 上游模型和可选账号组。'
      : '更新已有模型映射的目标模型、路由范围和流式能力，保存后立即影响后端路由。';
  }

  protected get streamLabel(): string {
    return this.form.controls.stream.value ? '允许流式' : '关闭流式';
  }

  protected get timeoutLabel(): string {
    return `${Math.max(Number(this.form.controls.timeoutSec.value || 0), 1)}s`;
  }

  protected get groupLabel(): string {
    return this.form.controls.accountGroup.value || '全局账号组';
  }

  protected get providerLabel(): string {
    return getProviderLabel('openai');
  }

  protected get relatedAccountCount(): number {
    return this.matchedAccounts.length;
  }

  protected get routeScopeLabel(): string {
    const group = this.form.controls.accountGroup.value;
    return group ? `OpenAI / ${group}` : 'OpenAI / 全部账号组';
  }

  protected get hasScopedRoute(): boolean {
    return true;
  }

  protected get modelOptionHint(): string {
    const group = this.form.controls.accountGroup.value;
    if (this.upstreamModelOptions.length)
      return '已按 OpenAI 账号组筛选可用模型，请从候选模型中选择。';
    if (!group) return '当前 OpenAI 账号没有模型记录，请手动输入上游模型名。';
    return '当前范围下没有账号支持模型记录，请手动输入上游模型名。';
  }

  private get matchedAccounts(): Account[] {
    const group = this.form.controls.accountGroup.value;
    return this.relatedAccounts.filter((item) => {
      if (item.provider !== 'openai') return false;
      if (group && (item.accountGroup || '') !== group) return false;
      return true;
    });
  }

  private enterCreateMode(): void {
    const queryGroup = (this.route.snapshot.queryParamMap.get('group') || '').trim();
    this.mergeSelectOptions([], queryGroup ? [queryGroup] : []);
    this.formMode = 'create';
    this.modelGuid = '';
    this.model = null;
    this.form.reset({
      publicModel: '',
      aliases: '',
      upstreamModel: '',
      provider: 'openai',
      accountGroup: queryGroup,
      stream: true,
      timeoutSec: 120,
    });
    this.syncUpstreamModelOptions();
    this.cdr.markForCheck();
  }

  private enterEditMode(guid: string): void {
    this.formMode = 'edit';
    this.modelGuid = guid;
    this.loading = true;
    this.modelsService
      .get(guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((model) => {
        this.model = model;
        this.mergeSelectOptions([], [model.accountGroup]);
        this.form.reset({
          publicModel: model.publicModel ?? '',
          aliases: model.aliases ?? '',
          upstreamModel: model.upstreamModel ?? '',
          provider: 'openai',
          accountGroup: model.accountGroup ?? '',
          stream: Boolean(model.stream),
          timeoutSec: model.timeoutSec || 120,
        });
        this.syncUpstreamModelOptions();
      });
  }

  private loadSelectOptions(): void {
    forkJoin({
      accounts: this.accountsService.listAll(),
      groups: this.accountsService.listGroups(),
    }).subscribe({
      next: ({ accounts, groups }) => {
        this.relatedAccounts = (accounts ?? []).filter((item) => item.provider === 'openai');
        this.mergeSelectOptions(
          [],
          groups.filter((item) => item.enabled).map((item) => item.name),
        );
        this.syncUpstreamModelOptions();
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
  }

  private mergeSelectOptions(_providers: string[], accountGroups: string[]): void {
    this.providerOptions = mergeProviderOptions([]);
    this.accountGroupOptions = mergeStringOptions(DEFAULT_ACCOUNT_GROUP_OPTIONS, accountGroups);
  }

  private syncUpstreamModelOptions(): void {
    this.upstreamModelOptions = Array.from(
      new Set(
        this.matchedAccounts
          .flatMap((account) => this.parseSupportedModels(account.supportedModels))
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
    this.cdr.markForCheck();
  }

  private parseSupportedModels(value?: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item)).filter(Boolean);
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }
}
