import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { ModelAccountItem, ModelCatalogItem, ModelPriceItem } from '../model.model';
import { ModelsService } from '../models.service';

@Component({
  selector: 'app-model-list',
  templateUrl: './model-list.component.html',
  styleUrls: ['./model-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule],
})
export class ModelListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly modelsService = inject(ModelsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly q = {
    page: 1,
    size: 10,
    enabled: '',
    vendorCode: '',
    productCode: '',
    content: '',
  };

  protected data: ModelCatalogItem[] = [];
  protected loading = false;
  protected syncing = false;
  protected pricingSyncing = false;
  protected accountsLoading = false;
  protected accountsVisible = false;
  protected pricingVisible = false;
  protected selectedModel: ModelCatalogItem | null = null;
  protected selectedPricingModel: ModelCatalogItem | null = null;
  protected modelAccounts: ModelAccountItem[] = [];
  protected totalCount = 0;

  protected readonly enabledTag: STColumnTag = {
    true: { text: '已启用', color: 'green' },
    false: { text: '已停用', color: 'default' },
  };

  protected readonly visibleTag: STColumnTag = {
    true: { text: '对外可见', color: 'blue' },
    false: { text: '已隐藏', color: 'default' },
  };

  protected readonly columns: Array<STColumn<ModelCatalogItem>> = [
    { title: '模型', index: 'remoteModelId', render: 'modelRender', width: 250 },
    { title: '官方来源', index: 'vendorCode', render: 'sourceRender', width: 150 },
    { title: '账号可用性', index: 'availableAccountCount', render: 'accountsRender', width: 130 },
    { title: '推理等级', index: 'reasoningEfforts', render: 'reasoningRender', width: 245 },
    { title: 'API 参考价', index: 'pricing', render: 'pricingRender', width: 255 },
    { title: '对外模型', index: 'publicModel', render: 'exposureRender', width: 210 },
    { title: '可见性', index: 'visible', type: 'tag', tag: this.visibleTag, width: 110 },
    { title: '启用状态', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 100 },
    { title: '最近同步', index: 'lastSeenAt', render: 'timeRender', width: 170 },
    {
      title: '操作',
      width: 225,
      fixed: 'right',
      buttons: [
        {
          text: '价格',
          click: (item) => this.showPricing(item),
          iif: (item) => Boolean(item.pricing?.length),
        },
        { text: '账号', click: (item) => this.showAccounts(item) },
        { text: '策略', click: (item) => this.edit(item.guid) },
        {
          text: '启用',
          click: (item) => this.setEnabled(item.guid, true),
          iif: (item) => !item.enabled,
        },
        {
          text: '停用',
          className: 'text-error',
          click: (item) => this.setEnabled(item.guid, false),
          iif: (item) => item.enabled,
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected get routablePageCount(): number {
    return this.data.filter((item) => item.enabled && item.availableAccountCount > 0).length;
  }

  protected getData(): void {
    this.loading = true;
    this.modelsService
      .list(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.data = result.data ?? [];
        this.totalCount = result.total ?? 0;
      });
  }

  protected syncAll(): void {
    this.syncing = true;
    this.modelsService
      .sync()
      .pipe(
        finalize(() => {
          this.syncing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        if (result.failed) {
          this.message.warning(
            `已同步 ${result.updated}/${result.checked} 个账号，${result.failed} 个失败`,
          );
        } else {
          this.message.success(`已从 ${result.updated} 个官方账号同步模型目录`);
        }
        this.q.page = 1;
        this.getData();
      });
  }

  protected syncPricing(): void {
    this.pricingSyncing = true;
    this.modelsService
      .syncPricing()
      .pipe(
        finalize(() => {
          this.pricingSyncing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        if (result.warning) {
          this.message.warning(result.warning);
        } else {
          this.message.success(`已同步 ${result.checked} 条 OpenAI 官方 API 参考价`);
        }
        this.getData();
      });
  }

  protected edit(guid: string): void {
    void this.router.navigate(['/models/edit', guid]);
  }

  protected showAccounts(model: ModelCatalogItem): void {
    this.selectedModel = model;
    this.modelAccounts = [];
    this.accountsVisible = true;
    this.accountsLoading = true;
    this.modelsService
      .accounts(model.guid)
      .pipe(
        finalize(() => {
          this.accountsLoading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((items) => (this.modelAccounts = items ?? []));
  }

  protected showPricing(model: ModelCatalogItem): void {
    this.selectedPricingModel = model;
    this.pricingVisible = true;
  }

  protected setEnabled(guid: string, enabled: boolean): void {
    this.modal.confirm({
      nzTitle: enabled ? '启用这个对外模型？' : '停用这个对外模型？',
      nzContent: enabled
        ? '启用后，有可用账号时会参与 OpenAI-compatible API 路由。'
        : '停用只影响对外路由，不会删除官方模型目录和账号可用性记录。',
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          const request = enabled
            ? this.modelsService.enable(guid)
            : this.modelsService.disable(guid);
          request.subscribe({
            next: () => {
              this.message.success(enabled ? '模型已启用' : '模型已停用');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected reset(): void {
    Object.assign(this.q, {
      page: 1,
      enabled: '',
      vendorCode: '',
      productCode: '',
      content: '',
    });
    this.getData();
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false });
  }

  protected formatAliases(value?: string): string {
    if (!value) return '无别名';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.length ? parsed.join(', ') : '无别名';
    } catch {
      return value;
    }
    return value;
  }

  protected reasoningEfforts(model: ModelCatalogItem): string[] {
    return Array.isArray(model.reasoningEfforts) ? model.reasoningEfforts.filter(Boolean) : [];
  }

  protected referencePrice(model: ModelCatalogItem): ModelPriceItem | undefined {
    return (model.pricing ?? []).find(
      (price) =>
        price.scope === 'api_reference' &&
        price.serviceTier === 'standard' &&
        price.contextTier === 'short',
    );
  }

  protected formatPrice(value?: number | null): string {
    if (value == null) return '—';
    const amount = value / 1_000_000;
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
  }

  protected serviceTierLabel(value: string): string {
    const labels: Record<string, string> = {
      standard: 'Standard',
      batch: 'Batch',
      flex: 'Flex',
      priority: 'Priority',
    };
    return labels[value] || value || '未知';
  }

  protected contextTierLabel(value: string): string {
    const labels: Record<string, string> = { short: '短上下文', long: '长上下文' };
    return labels[value] || value || '默认';
  }

  protected pricingSourceLabel(value?: string): string {
    if (value === 'official_docs_live') return 'OpenAI 官方文档（实时）';
    if (value === 'official_docs_snapshot') return 'OpenAI 官方文档快照';
    return value || '尚未同步';
  }

  protected sourceLabel(model: ModelCatalogItem): string {
    const vendor = model.vendorCode === 'openai' ? 'OpenAI' : model.vendorCode;
    const product = model.productCode === 'codex' ? 'Codex' : model.productCode;
    return `${vendor} · ${product}`;
  }

  protected accountStatus(item: ModelAccountItem): string {
    if (!item.enabled) return '账号已停用';
    if (!item.available) return '模型不可用';
    const labels: Record<string, string> = {
      available: '可路由',
      limited: '限流',
      cooldown: '冷却',
      exhausted: '额度耗尽',
      expired: '订阅过期',
      invalid: '凭据失效',
    };
    return labels[item.status] || item.status || '未知';
  }

  protected async copy(value: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success('模型 ID 已复制');
    } catch {
      this.message.warning('当前浏览器不允许自动复制');
    }
  }

  tableChange(event: STChange): void {
    if (['pi', 'ps', 'filter', 'sort'].includes(event.type)) {
      this.q.page = event.pi;
      this.q.size = event.ps;
      this.getData();
    }
  }
}
