import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { RequestLog } from '../request-log.model';
import { RequestLogsService } from '../request-logs.service';

interface TokenPricing {
  modelLabel: string;
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion: number;
  cacheWritePerMillion: number;
}

interface CostDetailRow {
  label: string;
  tokens: number;
  pricePerMillion: number;
  amount: number;
}

const DEFAULT_TOKEN_PRICING: TokenPricing = {
  modelLabel: 'GPT-5.5',
  inputPerMillion: 5,
  outputPerMillion: 30,
  cacheReadPerMillion: 0.5,
  cacheWritePerMillion: 5,
};

const TOKEN_PRICING: Array<{ pattern: RegExp; pricing: TokenPricing }> = [
  { pattern: /^gpt-5\.5/i, pricing: DEFAULT_TOKEN_PRICING },
];

@Component({
  selector: 'app-request-log-detail',
  templateUrl: './request-log-detail.component.html',
  styleUrls: ['./request-log-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class RequestLogDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected record: RequestLog | null = null;

  ngOnInit(): void {
    const guid = this.route.snapshot.paramMap.get('guid');
    if (!guid) {
      this.goList();
      return;
    }
    this.loading = true;
    this.requestLogsService
      .get(guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((record) => {
        this.record = record;
      });
  }

  protected goList(): void {
    void this.router.navigate(['/request-logs/list']);
  }

  protected requestMethod(item: RequestLog): string {
    return item.method || 'POST';
  }

  protected requestPath(item: RequestLog): string {
    return item.path || '/v1';
  }

  protected tokenTotal(item: RequestLog): number {
    return Number(item.inputTokens || 0) + Number(item.outputTokens || 0);
  }

  protected costPricing(item: RequestLog): TokenPricing {
    const model = item.upstreamModel || item.model || '';
    return TOKEN_PRICING.find((entry) => entry.pattern.test(model))?.pricing ?? {
      ...DEFAULT_TOKEN_PRICING,
      modelLabel: model || DEFAULT_TOKEN_PRICING.modelLabel,
    };
  }

  protected costRows(item: RequestLog): CostDetailRow[] {
    const pricing = this.costPricing(item);
    const inputTokens = Number(item.inputTokens || 0);
    const outputTokens = Number(item.outputTokens || 0);
    const cacheReadTokens = Number(item.cacheReadTokens ?? item.cachedInputTokens ?? 0);
    const cacheWriteTokens = Number(item.cacheWriteTokens || 0);
    return [
      {
        label: '输入',
        tokens: inputTokens,
        pricePerMillion: pricing.inputPerMillion,
        amount: this.resolveCost(item.inputCost, inputTokens, pricing.inputPerMillion),
      },
      {
        label: '输出',
        tokens: outputTokens,
        pricePerMillion: pricing.outputPerMillion,
        amount: this.resolveCost(item.outputCost, outputTokens, pricing.outputPerMillion),
      },
      {
        label: '缓存读取',
        tokens: cacheReadTokens,
        pricePerMillion: pricing.cacheReadPerMillion,
        amount: this.resolveCost(item.cacheReadCost, cacheReadTokens, pricing.cacheReadPerMillion),
      },
      {
        label: '缓存写入',
        tokens: cacheWriteTokens,
        pricePerMillion: pricing.cacheWritePerMillion,
        amount: this.resolveCost(item.cacheWriteCost, cacheWriteTokens, pricing.cacheWritePerMillion),
      },
    ];
  }

  protected subtotalCost(item: RequestLog): number {
    if (item.totalCost !== undefined && item.totalCost !== null) return Number(item.totalCost || 0);
    return this.costRows(item).reduce((sum, row) => sum + row.amount, 0);
  }

  protected chargedCost(item: RequestLog): number {
    if (item.chargedAmount !== undefined && item.chargedAmount !== null) return Number(item.chargedAmount || 0);
    const subtotal = this.subtotalCost(item);
    return subtotal > 0 ? Math.ceil(subtotal * 100) / 100 : 0;
  }

  protected isEstimatedCost(item: RequestLog): boolean {
    return item.totalCost === undefined && item.chargedAmount === undefined;
  }

  protected logTime(item: RequestLog): number | undefined {
    return item.createdAtUnix || item.createTime;
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  protected formatMs(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '-';
    return `${Number(value).toFixed(0)} ms`;
  }

  protected formatNumber(value?: number): string {
    return Number(value || 0).toLocaleString('zh-CN');
  }

  protected formatMoney(value?: number, minimumFractionDigits = 6): string {
    const amount = Number(value || 0);
    if (amount === 0) return '$0';
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits,
      maximumFractionDigits: minimumFractionDigits,
    })}`;
  }

  protected formatPrice(value?: number): string {
    return `$${Number(value || 0).toFixed(2)}/M`;
  }

  private resolveCost(value: number | undefined, tokens: number, pricePerMillion: number): number {
    if (value !== undefined && value !== null) return Number(value || 0);
    return (Number(tokens || 0) * Number(pricePerMillion || 0)) / 1_000_000;
  }

  protected async copy(value: string | undefined, label: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success(`${label}已复制`);
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择文本');
    }
  }
}
