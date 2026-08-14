import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type MetricCardTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'app-metric-card',
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.less'],
  host: {
    role: 'group',
    '[class.metric-card-neutral]': "tone === 'neutral'",
    '[class.metric-card-success]': "tone === 'success'",
    '[class.metric-card-warning]': "tone === 'warning'",
    '[class.metric-card-danger]': "tone === 'danger'",
    '[class.metric-card-info]': "tone === 'info'",
    '[attr.aria-label]': 'label',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number | null | undefined = '-';
  @Input() valueTitle: string | number | null | undefined;
  @Input() description = '';
  @Input() tone: MetricCardTone = 'neutral';
}
