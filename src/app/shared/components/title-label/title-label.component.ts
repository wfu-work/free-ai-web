import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'title-label',
  template: `
    <div class="title-label">
      @if (showBack) {
        <button type="button" class="title-label-back" aria-label="返回" (click)="handleBack()">
          <nz-icon nzType="arrow-left" />
        </button>
      }
      <div class="title-label-content">
        <h1 class="title-label-title">{{ title }}</h1>
        @if (description) {
          <p class="title-label-description">{{ description }}</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .title-label {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
      }

      .title-label-back {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 36px;
        height: 36px;
        margin-top: 2px;
        padding: 0;
        border: 1px solid rgb(var(--nm-primary-rgb) / 12%);
        border-radius: 12px;
        color: var(--nm-primary);
        font-size: 18px;
        background: rgb(var(--nm-primary-rgb) / 8%);
        cursor: pointer;
        transition:
          color 0.2s ease,
          background-color 0.2s ease,
          transform 0.2s ease;
      }

      .title-label-back:hover {
        transform: translateX(-1px);
        color: var(--nm-primary-active);
        background: rgb(var(--nm-primary-rgb) / 14%);
      }

      .title-label-content {
        min-width: 0;
      }

      .title-label-title {
        margin: 0;
        color: #172235;
        font-size: 26px;
        font-weight: 800;
        line-height: 1.28;
        letter-spacing: 0;
      }

      .title-label-description {
        margin: 8px 0 0;
        color: #65727f;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.6;
        letter-spacing: 0;
      }

      @media (max-width: 767px) {
        .title-label {
          gap: 10px;
        }

        .title-label-back {
          width: 34px;
          height: 34px;
          border-radius: 10px;
        }

        .title-label-title {
          font-size: 22px;
        }

        .title-label-description {
          font-size: 13px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzIconModule],
})
export class TitleLabelComponent {
  private readonly location = inject(Location);

  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() showBack = false;

  @Output() readonly back = new EventEmitter<void>();

  protected handleBack(): void {
    this.back.emit();
    this.location.back();
  }
}
