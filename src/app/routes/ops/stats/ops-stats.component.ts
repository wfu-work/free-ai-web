import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { finalize } from 'rxjs';

import { OpsStats } from '../ops.model';
import { OpsService } from '../ops.service';

@Component({
  selector: 'app-ops-stats',
  templateUrl: './ops-stats.component.html',
  styleUrls: ['./ops-stats.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class OpsStatsComponent implements OnInit {
  private readonly opsService = inject(OpsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected stats: OpsStats = { total: 0, success: 0, failures: 0, avgLatencyMs: 0 };

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.opsService
      .stats()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((stats) => {
        this.stats = stats ?? this.stats;
      });
  }

  protected get successRate(): string {
    if (!this.stats.total) return '--';
    return `${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`;
  }

  protected get failureRate(): string {
    if (!this.stats.total) return '--';
    return `${((this.stats.failures / this.stats.total) * 100).toFixed(1)}%`;
  }

  protected formatMs(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '-';
    return `${Number(value).toFixed(1)} ms`;
  }
}
