import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { catchError, forkJoin, map, of } from 'rxjs';

import { AccountsService } from '../../accounts/accounts.service';
import { ModelsService } from '../../models/models.service';

type TaskId = 'account-usage' | 'model-catalog' | 'model-pricing';

interface TaskDefinition {
  id: TaskId;
  title: string;
  schedule: string;
  description: string;
  icon: string;
}

interface TaskState {
  running: boolean;
  status: 'idle' | 'success' | 'warning' | 'error';
  lastRunAt?: number;
  message: string;
}

@Component({
  selector: 'app-ops-tasks',
  templateUrl: './ops-tasks.component.html',
  styleUrls: ['./ops-tasks.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, NzTagModule],
})
export class OpsTasksComponent {
  private readonly accountsService = inject(AccountsService);
  private readonly modelsService = inject(ModelsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly tasks: TaskDefinition[] = [
    {
      id: 'account-usage',
      title: '账号额度同步',
      schedule: '自动每 3 分钟',
      description: '读取官方账号池，为每个账号刷新额度窗口、订阅状态和下一次重置时间。',
      icon: 'dollar',
    },
    {
      id: 'model-catalog',
      title: '模型目录同步',
      schedule: '自动每 6 小时',
      description: '从已添加的官方账号发现远端模型，自动新增或更新本地模型目录。',
      icon: 'database',
    },
    {
      id: 'model-pricing',
      title: '官方定价同步',
      schedule: '自动每 6 小时',
      description: '同步官方模型输入、缓存输入和输出价格，用于调用记录成本估算。',
      icon: 'fund',
    },
  ];
  protected states: Record<TaskId, TaskState> = {
    'account-usage': this.idleState(),
    'model-catalog': this.idleState(),
    'model-pricing': this.idleState(),
  };

  protected stateOf(task: TaskDefinition): TaskState {
    return this.states[task.id];
  }

  protected run(task: TaskDefinition): void {
    const state = this.states[task.id];
    if (state.running) return;
    this.states = {
      ...this.states,
      [task.id]: { ...state, running: true, status: 'idle', message: '执行中...' },
    };
    this.cdr.markForCheck();

    switch (task.id) {
      case 'account-usage':
        this.runAccountUsage(task.id);
        break;
      case 'model-catalog':
        this.modelsService.sync({}).subscribe({
          next: (result) =>
            this.finish(
              task.id,
              'success',
              `检查 ${result?.checked ?? 0} 个账号，更新 ${result?.updated ?? 0} 个模型`,
            ),
          error: () => this.finish(task.id, 'error', '模型目录同步失败'),
        });
        break;
      case 'model-pricing':
        this.modelsService.syncPricing().subscribe({
          next: (result) =>
            this.finish(
              task.id,
              'success',
              `检查 ${result?.checked ?? 0} 个模型，更新 ${result?.updated ?? 0} 条定价`,
            ),
          error: () => this.finish(task.id, 'error', '官方定价同步失败'),
        });
        break;
    }
  }

  protected formatTime(value?: number): string {
    if (!value) return '尚未执行';
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }

  private runAccountUsage(taskId: TaskId): void {
    this.accountsService.listAll().subscribe({
      next: (accounts) => {
        if (!accounts?.length) {
          this.finish(taskId, 'warning', '当前没有可同步的官方账号');
          return;
        }
        forkJoin(
          accounts.map((account) =>
            this.accountsService.refreshUsage(account.guid).pipe(
              map(() => true),
              catchError(() => of(false)),
            ),
          ),
        ).subscribe((results) => {
          const success = results.filter(Boolean).length;
          const failed = results.length - success;
          this.finish(
            taskId,
            failed ? 'warning' : 'success',
            `完成 ${success}/${results.length} 个账号${failed ? `，${failed} 个失败` : ''}`,
          );
        });
      },
      error: () => this.finish(taskId, 'error', '账号列表加载失败'),
    });
  }

  private finish(taskId: TaskId, status: TaskState['status'], message: string): void {
    this.states = {
      ...this.states,
      [taskId]: { running: false, status, lastRunAt: Date.now(), message },
    };
    if (status === 'success') this.message.success(message);
    if (status === 'warning') this.message.warning(message);
    if (status === 'error') this.message.error(message);
    this.cdr.markForCheck();
  }

  private idleState(): TaskState {
    return { running: false, status: 'idle', message: '等待手动执行' };
  }
}
