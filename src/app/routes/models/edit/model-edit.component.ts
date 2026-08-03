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
import { NzTagModule } from 'ng-zorro-antd/tag';
import { catchError, finalize, of } from 'rxjs';

import { DEFAULT_ACCOUNT_GROUP_OPTIONS, mergeStringOptions } from '../../accounts/account-options';
import { AccountsService } from '../../accounts/accounts.service';
import { ModelCatalogItem, ModelPolicyPayload } from '../model.model';
import { ModelsService } from '../models.service';

@Component({
  selector: 'app-model-edit',
  templateUrl: './model-edit.component.html',
  styleUrls: ['./model-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, NzTagModule],
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
  protected modelGuid = '';
  protected model: ModelCatalogItem | null = null;
  protected accountGroupOptions = [...DEFAULT_ACCOUNT_GROUP_OPTIONS];

  protected readonly form = this.fb.nonNullable.group({
    publicModel: ['', [Validators.required]],
    aliases: [''],
    accountGroup: [''],
    timeoutSec: [120, [Validators.min(1)]],
    enabled: [true],
    visible: [true],
  });

  ngOnInit(): void {
    this.loadGroups();
    const guid = this.route.snapshot.paramMap.get('guid');
    if (!guid) {
      void this.router.navigateByUrl('/models/list');
      return;
    }
    this.modelGuid = guid;
    this.loadModel();
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid || !this.modelGuid) return;

    const value = this.form.getRawValue();
    const payload: ModelPolicyPayload = {
      publicModel: value.publicModel.trim(),
      aliases: value.aliases.trim(),
      accountGroup: value.accountGroup || '',
      timeoutSec: Math.max(Number(value.timeoutSec || 0), 1),
      enabled: value.enabled,
      visible: value.visible,
    };
    this.saving = true;
    this.modelsService
      .update(this.modelGuid, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((model) => {
        this.model = model;
        this.message.success('模型对外策略已更新');
        void this.router.navigateByUrl('/models/list');
      });
  }

  protected goList(): void {
    void this.router.navigateByUrl('/models/list');
  }

  protected get sourceLabel(): string {
    if (!this.model) return '-';
    const vendor = this.model.vendorCode === 'openai' ? 'OpenAI' : this.model.vendorCode;
    const product = this.model.productCode === 'codex' ? 'Codex' : this.model.productCode;
    return `${vendor} · ${product}`;
  }

  protected get routeStateLabel(): string {
    if (!this.form.controls.enabled.value) return '已停用';
    if (!this.model?.availableAccountCount) return '暂无账号可用';
    return `${this.model.availableAccountCount} 个账号可路由`;
  }

  protected capabilities(): string[] {
    const raw = this.model?.capabilitiesJson;
    if (!raw) return [];
    try {
      const value = JSON.parse(raw) as Record<string, unknown>;
      return Object.entries(value).flatMap(([key, item]) => {
        if (Array.isArray(item)) return item.map((part) => `${key}: ${String(part)}`);
        return [`${key}: ${String(item)}`];
      });
    } catch {
      return [];
    }
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false });
  }

  private loadModel(): void {
    this.loading = true;
    this.modelsService
      .get(this.modelGuid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((model) => {
        this.model = model;
        this.accountGroupOptions = mergeStringOptions(this.accountGroupOptions, [
          model.accountGroup,
        ]);
        this.form.reset({
          publicModel: model.publicModel || model.remoteModelId,
          aliases: model.aliases || '',
          accountGroup: model.accountGroup || '',
          timeoutSec: model.timeoutSec || 120,
          enabled: model.enabled,
          visible: model.visible,
        });
      });
  }

  private loadGroups(): void {
    this.accountsService
      .listGroups()
      .pipe(catchError(() => of([])))
      .subscribe((groups) => {
        this.accountGroupOptions = mergeStringOptions(
          DEFAULT_ACCOUNT_GROUP_OPTIONS,
          groups.filter((item) => item.enabled).map((item) => item.name),
        );
        this.cdr.markForCheck();
      });
  }
}
