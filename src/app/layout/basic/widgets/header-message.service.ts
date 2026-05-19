import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { AccountHealthItem, AccountQuota } from '../../../routes/accounts/account.model';
import { getProviderLabel } from '../../../routes/accounts/account-options';
import { AccountsService } from '../../../routes/accounts/accounts.service';
import { MasterKeyStatus, OpsMetrics, OpsStats } from '../../../routes/ops/ops.model';
import { OpsService } from '../../../routes/ops/ops.service';
import { RequestLog } from '../../../routes/request-logs/request-log.model';
import { RequestLogsService } from '../../../routes/request-logs/request-logs.service';
import type { HeaderMessageItem } from './message';

type MessageRoute = string | Array<string | number>;

interface HeaderEventSource {
  metrics: OpsMetrics | null;
  stats: OpsStats | null;
  masterKey: MasterKeyStatus | null;
  healthItems: AccountHealthItem[];
  logs: RequestLog[];
}

@Injectable({ providedIn: 'root' })
export class HeaderMessageService {
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly accountsService = inject(AccountsService);
  private readonly opsService = inject(OpsService);
  private readonly readStorageKey = 'free-ai-header-message-read-ids';
  private readonly refreshIntervalMs = 30000;
  private readonly recentWindowMs = 24 * 60 * 60 * 1000;

  stream(): Observable<HeaderMessageItem[]> {
    return timer(0, this.refreshIntervalMs).pipe(switchMap(() => this.load()));
  }

  markRead(id: HeaderMessageItem['id']): void {
    const readIds = this.getReadIds();
    readIds.add(String(id));
    this.setReadIds(readIds);
  }

  markAllRead(items: HeaderMessageItem[]): void {
    const readIds = this.getReadIds();
    items.forEach((item) => readIds.add(String(item.id)));
    this.setReadIds(readIds);
  }

  private load(): Observable<HeaderMessageItem[]> {
    const since = Date.now() - this.recentWindowMs;
    return forkJoin({
      metrics: this.opsService.metrics().pipe(catchError(() => of(null as OpsMetrics | null))),
      stats: this.opsService.stats().pipe(catchError(() => of(null as OpsStats | null))),
      masterKey: this.opsService.masterKey().pipe(catchError(() => of(null as MasterKeyStatus | null))),
      healthItems: this.accountsService.health().pipe(catchError(() => of([] as AccountHealthItem[]))),
      logs: this.requestLogsService.list(80, since).pipe(catchError(() => of([] as RequestLog[]))),
    }).pipe(map((source: HeaderEventSource) => this.applyReadState(this.buildMessages(source))));
  }

  private buildMessages(source: HeaderEventSource): HeaderMessageItem[] {
    const now = Date.now();
    const messages: HeaderMessageItem[] = [];

    if (!source.metrics) {
      messages.push(
        this.createMessage(
          'ops:metrics-unreachable',
          '网关状态无法获取',
          '管理端暂时无法读取网关运行指标，请确认后端服务和接口代理是否正常。',
          now,
          'error',
          '/ops/metrics',
        ),
      );
    } else if (!source.metrics.ok) {
      messages.push(
        this.createMessage(
          'ops:metrics-unhealthy',
          '网关健康检查异常',
          `${source.metrics.name || 'FreeAi 网关'} 当前健康状态异常，请进入运行指标查看账号、模型和密钥配置。`,
          now,
          'error',
          '/ops/metrics',
        ),
      );
    }

    if (source.metrics) {
      const missing: string[] = [];
      if (!source.metrics.enabledKeys) missing.push('平台密钥');
      if (!source.metrics.accounts) missing.push('账号');
      if (!source.metrics.enabledModels) missing.push('模型映射');
      if (missing.length) {
        messages.push(
          this.createMessage(
            `ops:config-missing:${missing.join('-')}`,
            '网关配置待补齐',
            `当前缺少可用的${missing.join('、')}，请求可能无法完成路由。`,
            now,
            'warning',
            '/ops/metrics',
          ),
        );
      }
    }

    if (source.masterKey && !source.masterKey.loaded) {
      messages.push(
        this.createMessage(
          'ops:master-key-not-loaded',
          '主密钥未加载',
          source.masterKey.error || '平台密钥解密依赖主密钥，请在系统设置中检查主密钥文件状态。',
          source.masterKey.updatedAt || now,
          'warning',
          '/settings/security',
        ),
      );
    }

    const riskyAccounts = source.healthItems
      .filter((item) => item.enabled && this.isRiskyAccount(item))
      .sort((a, b) => this.accountRiskScore(b) - this.accountRiskScore(a))
      .slice(0, 4);

    riskyAccounts.forEach((item) => {
      messages.push(
        this.createMessage(
          `account:${item.guid}:${item.status}:${item.failureCount}`,
          '账号健康异常',
          `${item.name || item.guid}（${getProviderLabel(item.provider)}）状态为 ${this.accountStatusLabel(item.status)}，失败次数 ${item.failureCount || 0}。`,
          this.accountEventTime(item, now),
          this.accountMessageLevel(item),
          '/accounts/health',
        ),
      );
    });

    this.findRiskyQuotas(source.healthItems)
      .slice(0, 3)
      .forEach(({ account, quota }) => {
        messages.push(
          this.createMessage(
            `quota:${account.guid}:${quota.guid || quota.windowType}:${quota.status}:${Math.round(Number(quota.usedPercent || 0))}`,
            '账号额度风险',
            `${account.name || account.guid} 的 ${quota.windowType || '默认'} 额度已使用 ${Number(quota.usedPercent || 0).toFixed(0)}%，剩余额度 ${this.formatQuotaRemain(quota)}。`,
            quota.lastSyncedAt || now,
            quota.status === 'exhausted' ? 'error' : 'warning',
            '/accounts/health',
          ),
        );
      });

    const recentLogs = [...source.logs].sort((a, b) => this.logTime(b) - this.logTime(a));

    recentLogs
      .filter((log) => this.isFailureLog(log))
      .slice(0, 5)
      .forEach((log) => {
        messages.push(
          this.createMessage(
            `request-log:error:${log.guid || log.requestId}`,
            '请求失败',
            `${this.logProvider(log)} ${log.model || log.upstreamModel || '未指定模型'} 返回 ${log.statusCode || log.errorType || '异常'}，路径 ${log.path || '/v1'}。`,
            this.logTime(log) || now,
            'error',
            log.guid ? ['/request-logs/detail', log.guid] : '/request-logs/list',
          ),
        );
      });

    recentLogs
      .filter((log) => !this.isFailureLog(log) && log.switched)
      .slice(0, 2)
      .forEach((log) => {
        messages.push(
          this.createMessage(
            `request-log:switch:${log.guid || log.requestId}`,
            '请求发生路由切换',
            `${log.model || log.upstreamModel || '未指定模型'} 已切换 ${log.switchCount || 1} 次，原因：${log.switchReason || '上游不可用或策略触发'}。`,
            this.logTime(log) || now,
            'warning',
            log.guid ? ['/request-logs/detail', log.guid] : '/request-logs/list',
          ),
        );
      });

    if (source.stats && source.stats.total > 0) {
      const failureRate = source.stats.failures / source.stats.total;
      if (failureRate >= 0.2) {
        messages.push(
          this.createMessage(
            `ops:failure-rate:${Math.round(failureRate * 100)}`,
            '请求失败率偏高',
            `累计 ${source.stats.total} 次请求中失败 ${source.stats.failures} 次，失败率 ${Math.round(failureRate * 100)}%。`,
            now,
            failureRate >= 0.5 ? 'error' : 'warning',
            '/ops/stats',
          ),
        );
      }
    }

    return messages.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 12);
  }

  private createMessage(
    id: string,
    title: string,
    content: string,
    time: string | number | Date,
    level: HeaderMessageItem['level'],
    route?: MessageRoute,
  ): HeaderMessageItem {
    return {
      id,
      title,
      content,
      time,
      read: false,
      level,
      route,
    };
  }

  private applyReadState(messages: HeaderMessageItem[]): HeaderMessageItem[] {
    const readIds = this.getReadIds();
    return messages.map((item) => ({ ...item, read: readIds.has(String(item.id)) }));
  }

  private getReadIds(): Set<string> {
    try {
      const raw = localStorage.getItem(this.readStorageKey);
      if (!raw) return new Set<string>();
      const values = JSON.parse(raw);
      return new Set(Array.isArray(values) ? values.map((item) => String(item)) : []);
    } catch {
      return new Set<string>();
    }
  }

  private setReadIds(readIds: Set<string>): void {
    try {
      localStorage.setItem(this.readStorageKey, JSON.stringify(Array.from(readIds).slice(-300)));
    } catch {
      // Ignore storage errors in private mode or restricted environments.
    }
  }

  private isRiskyAccount(item: AccountHealthItem): boolean {
    if (['available'].includes(item.status)) return false;
    if (['limited', 'cooldown', 'exhausted', 'expired', 'invalid'].includes(item.status)) return true;
    return Boolean(item.failureCount || item.cooldownUntil);
  }

  private accountRiskScore(item: AccountHealthItem): number {
    const scoreMap: Record<string, number> = {
      invalid: 90,
      exhausted: 80,
      expired: 70,
      cooldown: 60,
      limited: 50,
      unknown: 20,
    };
    return (scoreMap[item.status] || 10) + Number(item.failureCount || 0);
  }

  private accountStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      available: '可用',
      limited: '受限',
      cooldown: '冷却中',
      exhausted: '额度耗尽',
      disabled: '已禁用',
      expired: '已过期',
      invalid: '不可用',
      unknown: '未知',
    };
    return labels[status || ''] || status || '未知';
  }

  private accountMessageLevel(item: AccountHealthItem): HeaderMessageItem['level'] {
    return ['invalid', 'exhausted', 'expired'].includes(item.status) ? 'error' : 'warning';
  }

  private accountEventTime(item: AccountHealthItem, fallback: number): number {
    return item.cooldownUntil || item.lastUsedAt || item.nextUsageCheckAt || fallback;
  }

  private findRiskyQuotas(items: AccountHealthItem[]): Array<{ account: AccountHealthItem; quota: AccountQuota }> {
    return items
      .flatMap((account) =>
        (account.quotas || []).map((quota) => ({
          account,
          quota,
        })),
      )
      .filter(({ quota }) => ['limited', 'exhausted'].includes(quota.status) || Number(quota.usedPercent || 0) >= 85)
      .sort((a, b) => Number(b.quota.usedPercent || 0) - Number(a.quota.usedPercent || 0));
  }

  private formatQuotaRemain(quota: AccountQuota): string {
    if (quota.unit === 'usd') {
      return `$${Number(quota.remainingAmount || 0).toFixed(2)}`;
    }
    const remaining = Number(quota.remainingTokens || 0);
    if (remaining >= 1_000_000) return `${(remaining / 1_000_000).toFixed(1)}M tokens`;
    if (remaining >= 1_000) return `${(remaining / 1_000).toFixed(1)}K tokens`;
    return `${remaining} tokens`;
  }

  private isFailureLog(log: RequestLog): boolean {
    return Number(log.statusCode || 0) >= 400 || Boolean(log.errorType);
  }

  private logTime(log: RequestLog): number {
    return Number(log.createdAtUnix || log.createTime || 0);
  }

  private logProvider(log: RequestLog): string {
    return getProviderLabel(log.provider) || log.accountName || '上游';
  }
}
