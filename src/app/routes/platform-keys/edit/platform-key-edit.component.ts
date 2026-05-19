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
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';

import { CreatePlatformKeyResult, PlatformKey, PlatformKeyPayload } from '../platform-key.model';
import { PlatformKeysService } from '../platform-keys.service';
import { AccountsService } from '../../accounts/accounts.service';
import { ModelsService } from '../../models/models.service';

type PlatformKeyFormMode = 'create' | 'edit';

@Component({
  selector: 'app-platform-key-edit',
  templateUrl: './platform-key-edit.component.html',
  styleUrls: ['./platform-key-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class PlatformKeyEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformKeysService = inject(PlatformKeysService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly accountsService = inject(AccountsService);
  private readonly modelsService = inject(ModelsService);

  protected loading = false;
  protected saving = false;
  protected formMode: PlatformKeyFormMode = 'create';
  protected keyGuid = '';
  protected platformKey: PlatformKey | null = null;
  protected accountGroupOptions: string[] = [];
  protected modelOptions: string[] = [];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    routingStrategy: ['account_round_robin'],
    accountGroupFilter: [''],
    totalTokenLimit: [0],
    tokenLimitUnit: ['k'],
    protocolType: ['openai_compatible'],
    boundModel: [''],
    reasoningEffort: [''],
    serviceTier: [''],
    allowedModels: [''],
    rateLimitPerMinute: [0],
    remark: [''],
  });

  ngOnInit(): void {
    this.loadOptions();
    const guid = this.route.snapshot.paramMap.get('guid');
    if (guid) {
      this.enterEditMode(guid);
      return;
    }
    this.enterCreateMode();
  }

  private loadOptions(): void {
    forkJoin({
      groups: this.accountsService.listGroups().pipe(catchError(() => of([]))),
      models: this.modelsService.listAll().pipe(catchError(() => of([]))),
    }).subscribe(({ groups, models }) => {
      this.accountGroupOptions = groups.filter((item) => item.enabled).map((item) => item.name);
      this.modelOptions = Array.from(
        new Set(models.map((item) => item.publicModel).filter(Boolean)),
      );
      this.cdr.markForCheck();
    });
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload: PlatformKeyPayload = {
      ...this.platformKey,
      ...value,
      totalTokenLimit: Math.max(Number(value.totalTokenLimit || 0), 0),
      rateLimitPerMinute: Math.max(Number(value.rateLimitPerMinute || 0), 0),
    };

    this.saving = true;
    const request: Observable<CreatePlatformKeyResult | PlatformKey> =
      this.formMode === 'create'
        ? this.platformKeysService.create(payload)
        : this.platformKeysService.update(this.keyGuid, payload);

    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.platformKey = this.isCreateResult(result) ? result.entity : result;
        this.message.success(this.formMode === 'create' ? '平台密钥已创建' : '平台密钥已更新');
        this.router.navigateByUrl('/platform-keys/list');
      });
  }

  protected goList(): void {
    this.router.navigateByUrl('/platform-keys/list');
  }

  protected get pageTitle(): string {
    return this.formMode === 'create' ? '创建平台密钥' : '编辑平台密钥';
  }

  protected get pageDescription(): string {
    return this.formMode === 'create'
      ? '创建业务客户端访问网关所需的平台密钥，并配置模型、账号组、协议和限流策略。'
      : '调整平台密钥的路由策略、模型绑定、协议类型、额度限制和访问控制。';
  }

  protected get routingStrategyLabel(): string {
    switch (this.form.controls.routingStrategy.value) {
      case 'api_round_robin':
        return '聚合 API 轮转';
      case 'mixed_round_robin':
        return '混合轮转';
      case 'account_round_robin':
      default:
        return '账号轮转';
    }
  }

  protected get accountGroupLabel(): string {
    return this.form.controls.accountGroupFilter.value || '全部账号';
  }

  protected get protocolLabel(): string {
    switch (this.form.controls.protocolType.value) {
      case 'claude':
        return 'Claude 语义';
      case 'gemini':
        return 'Gemini 语义';
      case 'openai_compatible':
      default:
        return '通配兼容';
    }
  }

  protected get tokenLimitLabel(): string {
    const value = Number(this.form.controls.totalTokenLimit.value || 0);
    if (!value) return '不限额度';
    return `${value}${this.form.controls.tokenLimitUnit.value || ''} tokens`;
  }

  private enterCreateMode(): void {
    this.formMode = 'create';
    this.keyGuid = '';
    this.platformKey = null;
    this.form.reset({
      name: '',
      routingStrategy: 'account_round_robin',
      accountGroupFilter: '',
      totalTokenLimit: 0,
      tokenLimitUnit: 'k',
      protocolType: 'openai_compatible',
      boundModel: '',
      reasoningEffort: '',
      serviceTier: '',
      allowedModels: '',
      rateLimitPerMinute: 0,
      remark: '',
    });
    this.cdr.markForCheck();
  }

  private enterEditMode(guid: string): void {
    this.formMode = 'edit';
    this.keyGuid = guid;
    this.loading = true;
    this.platformKeysService
      .get(guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((r) => {
        this.platformKey = r;
        this.form.reset({
          name: r.name ?? '',
          routingStrategy: r.routingStrategy || 'account_round_robin',
          accountGroupFilter: r.accountGroupFilter ?? '',
          totalTokenLimit: r.totalTokenLimit ?? 0,
          tokenLimitUnit: r.tokenLimitUnit || 'k',
          protocolType: r.protocolType || 'openai_compatible',
          boundModel: r.boundModel ?? '',
          reasoningEffort: r.reasoningEffort ?? '',
          serviceTier: r.serviceTier ?? '',
          allowedModels: r.allowedModels ?? '',
          rateLimitPerMinute: r.rateLimitPerMinute ?? 0,
          remark: r.remark ?? '',
        });
      });
  }

  private isCreateResult(value: CreatePlatformKeyResult | PlatformKey): value is CreatePlatformKeyResult {
    return 'entity' in value;
  }
}
