import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin } from 'rxjs';

import { Account } from '../../accounts/account.model';
import { AccountsService } from '../../accounts/accounts.service';
import { ModelRouteState } from '../model.model';
import { ModelsService } from '../models.service';

@Component({
  selector: 'app-model-routes',
  templateUrl: './model-routes.component.html',
  styleUrls: ['./model-routes.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class ModelRoutesComponent implements OnInit {
  private readonly modelsService = inject(ModelsService);
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  q = {
    page: 1,
    size: 10,
    linked: '',
    content: '',
  };

  protected rawData: ModelRouteState[] = [];
  protected data: ModelRouteState[] = [];
  protected loading = false;
  protected accountMap = new Map<string, Account>();
  totalCount = 0;

  protected readonly columns: Array<STColumn<ModelRouteState>> = [
    { title: '路由键', index: 'routeKey', render: 'routeKeyRender', width: 280 },
    { title: '最近命中账号', render: 'accountRender', width: 220 },
    { title: '游标', index: 'cursor', width: 90 },
    { title: '更新时间', render: 'updatedRender', width: 180 },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    forkJoin({
      states: this.modelsService.routeStates(),
      accounts: this.accountsService.listAll(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ states, accounts }) => {
        this.rawData = states ?? [];
        this.accountMap = new Map((accounts ?? []).map((item) => [item.guid, item]));
        this.applyTableFilters();
      });
  }

  protected get routeCount(): number {
    return this.data.length;
  }

  protected get linkedCount(): number {
    return this.data.filter((item) => Boolean(item.lastAccountGuid)).length;
  }

  protected get staleCount(): number {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return this.data.filter((item) => !item.updatedAtUnix || now - item.updatedAtUnix > oneDayMs).length;
  }

  protected get latestUpdateLabel(): string {
    const latest = this.data.reduce((max, item) => Math.max(max, item.updatedAtUnix || 0), 0);
    return this.formatTime(latest);
  }

  protected accountName(guid?: string): string {
    if (!guid) return '未命中';
    return this.accountMap.get(guid)?.name || guid;
  }

  protected accountProvider(guid?: string): string {
    if (!guid) return '暂无账号';
    const account = this.accountMap.get(guid);
    if (!account) return '账号已不存在';
    return `${account.provider || '-'} / ${account.accountGroup || '默认账号组'}`;
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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

  protected applyTableFilters(): void {
    const linked = this.q.linked;
    const content = this.q.content.trim().toLowerCase();
    this.data = this.rawData.filter((item) => {
      if (linked !== '') {
        const hasAccount = Boolean(item.lastAccountGuid);
        if (Number(linked) !== Number(hasAccount)) return false;
      }
      if (!content) return true;
      return [item.routeKey, item.guid, item.lastAccountGuid, this.accountName(item.lastAccountGuid)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(content));
    });
    this.totalCount = this.data.length;
    this.cdr.markForCheck();
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
