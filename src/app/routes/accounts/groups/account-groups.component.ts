import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { getAccountTypeLabel } from '../account-options';
import { Account, AccountGroup } from '../account.model';
import { AccountsService } from '../accounts.service';
import { ModelMapping } from '../../models/model.model';
import { ModelsService } from '../../models/models.service';

interface AccountGroupRow extends AccountGroup {
  providers: string[];
  accountTypes: string[];
  publicModels: string[];
  accountCount: number;
  enabledCount: number;
  availableCount: number;
  enabledModelCount: number;
  hasAccounts: boolean;
  hasModels: boolean;
}

@Component({
  selector: 'app-account-groups',
  templateUrl: './account-groups.component.html',
  styleUrls: ['./account-groups.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountGroupsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly modelsService = inject(ModelsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = false;
  protected saving = false;
  protected formVisible = false;
  protected editing: AccountGroup | null = null;
  protected items: AccountGroupRow[] = [];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    sort: [0],
    enabled: [true],
    remark: [''],
  });

  protected readonly columns: Array<STColumn<AccountGroupRow>> = [
    { title: '账号分组', render: 'groupRender', width: 230 },
    { title: '供应商覆盖', render: 'providerRender', width: 190 },
    { title: '账号池', render: 'accountRender', width: 150 },
    { title: '已启用模型', render: 'modelRender', width: 230 },
    { title: '账号类型', render: 'typeRender', width: 170 },
    { title: '状态', render: 'statusRender', width: 130 },
    { title: '操作', render: 'actionRender', width: 220, fixed: 'right' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      groups: this.accountsService.listGroups(),
      accounts: this.accountsService.list(),
      models: this.modelsService.list(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ groups, accounts, models }) => {
        this.items = this.buildItems(groups ?? [], accounts ?? [], models ?? []);
      });
  }

  protected openCreate(): void {
    this.editing = null;
    this.form.reset({ name: '', description: '', sort: 0, enabled: true, remark: '' });
    this.formVisible = true;
  }

  protected openEdit(item: AccountGroup): void {
    this.editing = item;
    this.form.reset({
      name: item.name ?? '',
      description: item.description ?? '',
      sort: item.sort ?? 0,
      enabled: item.enabled,
      remark: item.remark ?? '',
    });
    this.formVisible = true;
  }

  protected closeForm(): void {
    this.formVisible = false;
    this.saving = false;
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) return;

    this.saving = true;
    const payload = this.form.getRawValue();
    const request = this.editing
      ? this.accountsService.updateGroup(this.editing.guid, payload)
      : this.accountsService.createGroup(payload);
    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(() => {
        this.message.success(this.editing ? '账号分组已更新' : '账号分组已创建');
        this.formVisible = false;
        this.load();
      });
  }

  protected delete(item: AccountGroupRow): void {
    this.modal.confirm({
      nzTitle: '确定删除该账号分组？',
      nzContent: item.accountCount || item.enabledModelCount
        ? '该分组已有账号或模型映射引用，后端会拒绝删除。'
        : '删除后新增账号和模型映射将无法再选择该分组。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.accountsService.deleteGroup(item.guid).subscribe({
            next: () => {
              this.message.success('账号分组已删除');
              this.load();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected get totalGroups(): number {
    return this.items.length;
  }

  protected get activeGroups(): number {
    return this.items.filter((item) => item.enabled && item.availableCount > 0 && item.enabledModelCount > 0).length;
  }

  protected get pendingAccountGroups(): number {
    return this.items.filter((item) => item.hasModels && !item.hasAccounts).length;
  }

  protected get pendingModelGroups(): number {
    return this.items.filter((item) => item.hasAccounts && !item.hasModels).length;
  }

  protected groupStatus(item: AccountGroupRow): string {
    if (!item.enabled) return '已停用';
    if (item.hasModels && !item.hasAccounts) return '缺账号';
    if (item.hasAccounts && !item.hasModels) return '缺模型';
    if (!item.availableCount) return '无可用账号';
    return '已接入';
  }

  protected groupTone(item: AccountGroupRow): string {
    if (!item.enabled) return 'tone-muted';
    if (item.hasModels && !item.hasAccounts) return 'tone-danger';
    if (item.hasAccounts && !item.hasModels) return 'tone-warning';
    if (!item.availableCount) return 'tone-warning';
    return 'tone-success';
  }

  protected modelSummary(item: AccountGroupRow): string {
    if (!item.enabledModelCount) return '未绑定模型';
    return `${item.enabledModelCount} 个模型`;
  }

  protected createAccount(group: string): void {
    this.router.navigate(['/accounts/edit'], { queryParams: { group } });
  }

  protected createModel(group: string): void {
    this.router.navigate(['/models/edit'], { queryParams: { group } });
  }

  private buildItems(groups: AccountGroup[], accounts: Account[], models: ModelMapping[]): AccountGroupRow[] {
    const rows = new Map<string, AccountGroupRow>();

    groups.forEach((group) => {
      rows.set(this.normalizeGroupName(group.name), {
        ...group,
        name: this.normalizeGroupName(group.name),
        providers: [],
        accountTypes: [],
        publicModels: [],
        accountCount: 0,
        enabledCount: 0,
        availableCount: 0,
        enabledModelCount: 0,
        hasAccounts: false,
        hasModels: false,
      });
    });

    accounts.forEach((account) => {
      const item = this.ensureRow(rows, this.normalizeGroupName(account.accountGroup));
      item.hasAccounts = true;
      item.accountCount += 1;
      item.enabledCount += account.enabled ? 1 : 0;
      item.availableCount += account.enabled && account.status === 'available' ? 1 : 0;
      if (account.provider) item.providers.push(account.provider);
      if (account.accountType) item.accountTypes.push(getAccountTypeLabel(account.accountType));
    });

    models.forEach((model) => {
      const item = this.ensureRow(rows, this.normalizeGroupName(model.accountGroup));
      item.hasModels = true;
      if (model.provider) item.providers.push(model.provider);
      if (model.enabled) {
        item.enabledModelCount += 1;
        if (model.publicModel) item.publicModels.push(model.publicModel);
      }
    });

    return Array.from(rows.values())
      .map((item) => ({
        ...item,
        providers: this.unique(item.providers),
        accountTypes: this.unique(item.accountTypes),
        publicModels: this.unique(item.publicModels),
      }))
      .sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.name.localeCompare(b.name, 'zh-CN'));
  }

  private ensureRow(rows: Map<string, AccountGroupRow>, name: string): AccountGroupRow {
    if (!rows.has(name)) {
      rows.set(name, {
        guid: '',
        name,
        description: '',
        sort: 0,
        enabled: true,
        remark: '',
        providers: [],
        accountTypes: [],
        publicModels: [],
        accountCount: 0,
        enabledCount: 0,
        availableCount: 0,
        enabledModelCount: 0,
        hasAccounts: false,
        hasModels: false,
      });
    }
    return rows.get(name)!;
  }

  private normalizeGroupName(value?: string): string {
    return (value || '').trim() || 'default';
  }

  private unique(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean)));
  }
}
