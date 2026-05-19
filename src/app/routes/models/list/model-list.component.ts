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
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { ModelMapping } from '../model.model';
import { ModelsService } from '../models.service';

@Component({
  selector: 'app-model-list',
  templateUrl: './model-list.component.html',
  styleUrls: ['./model-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class ModelListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly modelsService = inject(ModelsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  q = {
    page: 1,
    size: 10,
    enabled: '',
    content: '',
  };

  protected data: ModelMapping[] = [];
  protected loading = false;
  totalCount = 0;

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly streamTag: STColumnTag = {
    true: { text: '支持', color: 'blue' },
    false: { text: '关闭', color: 'default' },
  };

  protected readonly columns: Array<STColumn<ModelMapping>> = [
    { title: '对外模型', index: 'publicModel', render: 'publicRender' },
    { title: '上游模型', index: 'upstreamModel', render: 'upstreamRender' },
    { title: '供应商 / 分组', index: 'provider', render: 'providerRender' },
    { title: '流式', index: 'stream', type: 'tag', tag: this.streamTag },
    { title: '超时', index: 'timeoutSec', render: 'timeoutRender' },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag },
    {
      title: '操作',
      width: 180,
      buttons: [
        {
          text: '编辑',
          click: (item: any) => this.edit(item.guid),
        },
        {
          text: '启用',
          click: (item: any) => this.setEnabled(item.guid, true),
          iif: (item: any) => !item.enabled,
          pop: {
            title: '确定启用?',
            okType: 'danger',
            icon: 'star'
          }
        },
        {
          text: '禁用',
          className: 'text-error',
          click: (item: any) => this.setEnabled(item.guid, false),
          iif: (item: any) => item.enabled,
          pop: {
            title: '确定禁用?',
            okType: 'danger',
            icon: 'star'
          }
        },
        {
          text: '删除',
          className: 'text-error',
          click: (item: any) => this.delete(item.guid),
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
    this.getData();
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
      .subscribe((r) => {
        this.data = r.data ?? [];
        this.totalCount = r.total ?? 0;
      });
  }

  protected add(): void {
    this.router.navigateByUrl('/models/edit');
  }

  protected edit(guid: string): void {
    this.router.navigate(['/models/edit', guid]);
  }

  protected setEnabled(guid: string, enabled: boolean): void {
    this.modal.confirm({
      nzTitle: enabled ? '确定启用该模型映射？' : '确定禁用该模型映射？',
      nzContent: enabled
        ? '启用后该 publicModel 会参与 /v1 路由。'
        : '禁用后该 publicModel 将不再可被路由命中。',
      nzOkType: enabled ? 'primary' : 'default',
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          const request = enabled
            ? this.modelsService.enable(guid)
            : this.modelsService.disable(guid);
          request.subscribe({
            next: () => {
              this.message.success(enabled ? '模型映射已启用' : '模型映射已禁用');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected delete(guid: string): void {
    this.modelsService.delete(guid).subscribe({
      next: () => {
        this.message.success('模型映射已删除');
        this.getData();
      },
      error: () => this.message.error('模型映射删除失败'),
    });
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

  protected async copy(value: string, label: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success(`${label}已复制`);
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择文本');
    }
  }

  /**
   * 表格复选框变化回调
   *
   * @param {STChange} event
   * @memberof ListComponent
   */
  tableChange(event: STChange): void {
    switch (event.type) {
      case 'checkbox':
        break;
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
