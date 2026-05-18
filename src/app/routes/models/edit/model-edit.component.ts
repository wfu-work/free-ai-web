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
      ? '配置 publicModel、上游模型、Provider、账号组与超时策略，建立新的代理路由映射。'
      : '更新已有模型映射的目标模型、账号组和流式能力，保存后立即影响后端路由。';
  }

  protected get streamLabel(): string {
    return this.form.controls.stream.value ? '允许流式' : '关闭流式';
  }

  protected get timeoutLabel(): string {
    return `${Math.max(Number(this.form.controls.timeoutSec.value || 0), 1)}s`;
  }

  protected get groupLabel(): string {
    return this.form.controls.accountGroup.value || '默认账号组';
  }

  protected get providerLabel(): string {
    return getProviderLabel(this.form.controls.provider.value);
  }

  protected get relatedAccountCount(): number {
    const provider = this.form.controls.provider.value;
    const group = this.form.controls.accountGroup.value;
    return this.relatedAccounts.filter((item) => {
      if (provider && item.provider !== provider) return false;
      return (item.accountGroup || '') === (group || '');
    }).length;
  }

  private enterCreateMode(): void {
    const queryProvider = (this.route.snapshot.queryParamMap.get('provider') || '').trim();
    const queryGroup = (this.route.snapshot.queryParamMap.get('group') || '').trim();
    this.mergeSelectOptions(queryProvider ? [queryProvider] : [], queryGroup ? [queryGroup] : []);
    this.formMode = 'create';
    this.modelGuid = '';
    this.model = null;
    this.form.reset({
      publicModel: '',
      aliases: '',
      upstreamModel: '',
      provider: queryProvider || 'openai',
      accountGroup: queryGroup,
      stream: true,
      timeoutSec: 120,
    });
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
        this.mergeSelectOptions([model.provider], [model.accountGroup]);
        this.form.reset({
          publicModel: model.publicModel ?? '',
          aliases: model.aliases ?? '',
          upstreamModel: model.upstreamModel ?? '',
          provider: model.provider ?? 'openai',
          accountGroup: model.accountGroup ?? '',
          stream: Boolean(model.stream),
          timeoutSec: model.timeoutSec || 120,
        });
      });
  }

  private loadSelectOptions(): void {
    forkJoin({
      models: this.modelsService.list(),
      accounts: this.accountsService.list(),
      groups: this.accountsService.listGroups(),
    }).subscribe({
      next: ({ models, accounts, groups }) => {
        this.relatedAccounts = accounts ?? [];
        this.mergeSelectOptions(
          [
            ...(models ?? []).map((item) => item.provider),
            ...(accounts ?? []).map((item) => item.provider),
          ],
          groups.filter((item) => item.enabled).map((item) => item.name),
        );
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
  }

  private mergeSelectOptions(providers: string[], accountGroups: string[]): void {
    this.providerOptions = mergeProviderOptions(providers);
    this.accountGroupOptions = mergeStringOptions(DEFAULT_ACCOUNT_GROUP_OPTIONS, accountGroups);
  }
}
