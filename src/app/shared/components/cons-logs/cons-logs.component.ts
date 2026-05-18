import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';

export type ConsLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ConsLogLevelFilter = 'all' | ConsLogLevel;

export interface ConsLogItem {
  time: string;
  level: ConsLogLevel;
  message: string;
  detail?: string | string[];
}

@Component({
  selector: 'app-cons-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSegmentedModule,
  ],
  templateUrl: './cons-logs.component.html',
  styleUrls: ['./cons-logs.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsLogsComponent {
  @Input() logs: ConsLogItem[] = [
    {
      time: '14:32:01.045',
      level: 'info',
      message: 'Connection established to primary database cluster (region: us-east-1).',
    },
    {
      time: '14:32:02.112',
      level: 'info',
      message:
        "Starting data synchronization task 'DataSync_Pipeline_A'. Worker thread pool initialized.",
    },
    {
      time: '14:32:15.890',
      level: 'warn',
      message:
        'High latency detected on partition 3 during bulk insert operation (latency: 450ms). Retrying...',
    },
    {
      time: '14:35:12.440',
      level: 'error',
      message: 'Failed to parse JSON payload at offset 1024. Malformed input string.',
      detail: [
        'Traceback (most recent call last):',
        'File "/app/workers/parser.py", line 42, in parse_record',
        "JSONDecodeError: Expecting ',' delimiter: line 1 column 1025 (char 1024)",
      ],
    },
    {
      time: '14:35:12.455',
      level: 'warn',
      message: 'Skipping malformed record. Dead-letter queue (DLQ) configured, message forwarded.',
    },
  ];

  @Input() streamUrl = 'wss://flowinsight.internal/stream/node_01';
  @Input() waitingText = 'Waiting for new logs...';
  @Input() height = 520;
  @Input() showToolbar = true;
  @Input() showActions = false;
  @Output() readonly clearLogs = new EventEmitter<void>();
  @Output() readonly exportLogs = new EventEmitter<void>();

  protected keyword = '';
  protected selectedStatus: ConsLogLevelFilter = 'all';
  protected readonly statusOptions: Array<{ label: string; value: ConsLogLevelFilter }> = [
    { label: '全部', value: 'all' },
    { label: '信息', value: 'info' },
    { label: '警告', value: 'warn' },
    { label: '错误', value: 'error' },
    { label: '调试', value: 'debug' },
  ];

  protected get filteredLogs(): ConsLogItem[] {
    const keyword = this.keyword.trim().toLowerCase();

    return this.logs.filter((log) => {
      const matchesLevel = this.selectedStatus === 'all' || log.level === this.selectedStatus;
      const detail = Array.isArray(log.detail) ? log.detail.join('\n') : (log.detail ?? '');
      const content = `${log.time} ${log.level} ${log.message} ${detail}`.toLowerCase();
      return matchesLevel && (!keyword || content.includes(keyword));
    });
  }

  protected onStatusChange(value: string | number): void {
    this.selectedStatus = String(value) as ConsLogLevelFilter;
  }

  protected trackByLog(index: number, log: ConsLogItem): string {
    return `${log.time}-${log.level}-${index}`;
  }

  protected asDetailLines(detail: string | string[] | undefined): string[] {
    if (!detail) {
      return [];
    }
    return Array.isArray(detail) ? detail : detail.split('\n');
  }
}
