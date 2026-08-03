import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';

import { AccountsService } from '../../accounts/accounts.service';
import { ModelsService } from '../../models/models.service';
import { CreatePlatformKeyResult, PlatformKey, PlatformKeyPayload } from '../apikey.model';
import { PlatformKeysService } from '../apikey.service';

type PlatformKeyFormMode = 'create' | 'edit';

@Component({
  selector: 'app-platform-key-edit',
  templateUrl: './apikey-edit.component.html',
  styleUrls: ['./apikey-edit.component.less'],
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
  protected createdSecret = '';

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    accountGroupFilter: [''],
    totalTokenLimit: [0],
    tokenLimitUnit: ['k'],
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
        new Set(
          models
            .filter((item) => item.enabled && item.availableAccountCount > 0)
            .map((item) => item.publicModel)
            .filter(Boolean),
        ),
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
        if (this.isCreateResult(result)) {
          this.createdSecret = result.key;
          this.message.success('API 密钥已创建，请立即复制并妥善保存');
          return;
        }
        this.message.success('API 密钥已更新');
        this.router.navigateByUrl('/access/keys');
      });
  }

  protected async copyCreatedSecret(): Promise<void> {
    if (!this.createdSecret) return;
    try {
      await navigator.clipboard.writeText(this.createdSecret);
      this.message.success('API 密钥已复制');
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择密钥');
    }
  }

  protected finishCreation(): void {
    this.createdSecret = '';
    this.router.navigateByUrl('/access/keys');
  }

  protected goList(): void {
    this.router.navigateByUrl('/access/keys');
  }

  protected get pageTitle(): string {
    return this.formMode === 'create' ? '创建API 密钥' : '编辑API 密钥';
  }

  protected get pageDescription(): string {
    return this.formMode === 'create'
      ? '创建业务客户端访问网关所需的API 密钥，并配置模型、账号组、协议和限流策略。'
      : '调整API 密钥的路由策略、模型绑定、协议类型、额度限制和访问控制。';
  }

  protected get accountGroupLabel(): string {
    return this.form.controls.accountGroupFilter.value || '全部账号';
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
      accountGroupFilter: '',
      totalTokenLimit: 0,
      tokenLimitUnit: 'k',
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
          accountGroupFilter: r.accountGroupFilter ?? '',
          totalTokenLimit: r.totalTokenLimit ?? 0,
          tokenLimitUnit: r.tokenLimitUnit || 'k',
          boundModel: r.boundModel ?? '',
          reasoningEffort: r.reasoningEffort ?? '',
          serviceTier: r.serviceTier ?? '',
          allowedModels: r.allowedModels ?? '',
          rateLimitPerMinute: r.rateLimitPerMinute ?? 0,
          remark: r.remark ?? '',
        });
      });
  }

  private isCreateResult(
    value: CreatePlatformKeyResult | PlatformKey,
  ): value is CreatePlatformKeyResult {
    return 'entity' in value;
  }
}
