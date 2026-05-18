import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STColumn, STColumnTag } from '@delon/abc/st';
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

  protected items: ModelMapping[] = [];
  protected loading = false;

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly streamTag: STColumnTag = {
    true: { text: '支持', color: 'blue' },
    false: { text: '关闭', color: 'default' },
  };

  protected readonly columns: Array<STColumn<ModelMapping>> = [
    { title: '对外模型', index: 'publicModel', render: 'publicRender', width: 240 },
    { title: '上游模型', index: 'upstreamModel', render: 'upstreamRender', width: 210 },
    { title: 'Provider / 分组', index: 'provider', render: 'providerRender', width: 170 },
    { title: '流式', index: 'stream', type: 'tag', tag: this.streamTag, width: 86 },
    { title: '超时', index: 'timeoutSec', render: 'timeoutRender', width: 86 },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 86 },
    { title: '操作', render: 'actionRender', width: 180, fixed: 'right' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.modelsService
      .list()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((items) => {
        this.items = items ?? [];
      });
  }

  protected openCreate(): void {
    this.router.navigateByUrl('/models/edit');
  }

  protected openEdit(item: ModelMapping): void {
    this.router.navigate(['/models/edit', item.guid]);
  }

  protected setEnabled(item: ModelMapping, enabled: boolean): void {
    this.modal.confirm({
      nzTitle: enabled ? '确定启用该模型映射？' : '确定禁用该模型映射？',
      nzContent: enabled ? '启用后该 publicModel 会参与 /v1 路由。' : '禁用后该 publicModel 将不再可被路由命中。',
      nzOkType: enabled ? 'primary' : 'default',
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          const request = enabled
            ? this.modelsService.enable(item.guid)
            : this.modelsService.disable(item.guid);
          request.subscribe({
            next: () => {
              this.message.success(enabled ? '模型映射已启用' : '模型映射已禁用');
              this.load();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected delete(item: ModelMapping): void {
    this.modal.confirm({
      nzTitle: '确定删除该模型映射？',
      nzContent: `删除后 ${item.publicModel} 将无法继续通过 /v1 被访问。`,
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.modelsService.delete(item.guid).subscribe({
            next: () => {
              this.message.success('模型映射已删除');
              this.load();
              resolve();
            },
            error: reject,
          });
        }),
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
}
