import { Component, inject } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

import { ThemeColorService } from '../../../shared/services/theme-color.service';

@Component({
  selector: 'theme-color',
  template: `
    <button
      type="button"
      class="theme-color-trigger"
      nz-popover
      nzPopoverPlacement="bottomRight"
      nzPopoverTrigger="click"
      [nzPopoverContent]="themePanel"
      [attr.aria-label]="'主题颜色：' + themeColor.current().label"
      title="主题颜色"
    >
      <i nz-icon nzType="bg-colors"></i>
      <span
        class="theme-color-trigger__swatch"
        [style.background]="themeColor.current().primary"
      ></span>
    </button>

    <ng-template #themePanel>
      <div class="theme-color-panel">
        <div class="theme-color-panel__title">主题颜色</div>
        <div class="theme-color-options">
          @for (preset of themeColor.presets; track preset.key) {
            <button
              type="button"
              class="theme-color-option"
              [class.theme-color-option-active]="themeColor.currentKey() === preset.key"
              (click)="themeColor.apply(preset.key)"
              [attr.aria-label]="preset.label"
            >
              <span class="theme-color-option__swatch" [style.background]="preset.primary"></span>
              <span class="theme-color-option__label">{{ preset.label }}</span>
            </button>
          }
        </div>
      </div>
    </ng-template>
  `,
  styles: [
    `
      .theme-color-trigger {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        padding: 0;
        border: 0;
        color: #56657d;
        background: transparent;
        cursor: pointer;
        transition:
          color 0.2s ease,
          transform 0.2s ease;
      }

      .theme-color-trigger:hover {
        transform: translateY(-1px);
        color: var(--nm-primary);
      }

      .theme-color-trigger .anticon {
        font-size: 18px;
      }

      .theme-color-trigger__swatch {
        position: absolute;
        right: 8px;
        bottom: 8px;
        width: 9px;
        height: 9px;
        border: 2px solid rgb(255 255 255 / 92%);
        border-radius: 50%;
        box-shadow: 0 2px 5px rgb(25 39 52 / 18%);
      }

      .theme-color-panel {
        width: 244px;
        padding: 4px;
      }

      .theme-color-panel__title {
        padding: 4px 4px 10px;
        font-size: 13px;
        font-weight: 700;
        color: #253044;
      }

      .theme-color-options {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .theme-color-option {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        min-height: 40px;
        padding: 0 9px;
        border: 1px solid transparent;
        border-radius: 12px;
        color: #4f5d73;
        font-size: 13px;
        font-weight: 600;
        background: transparent;
        cursor: pointer;
        transition:
          border-color 0.2s ease,
          background-color 0.2s ease,
          color 0.2s ease;
      }

      .theme-color-option:hover,
      .theme-color-option-active {
        border-color: rgb(var(--nm-primary-rgb) / 16%);
        color: #243044;
        background: rgb(var(--nm-primary-rgb) / 8%);
      }

      .theme-color-option__swatch {
        flex: 0 0 auto;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        box-shadow:
          inset 0 0 0 1px rgb(255 255 255 / 58%),
          0 3px 8px rgb(25 39 52 / 14%);
      }

      .theme-color-option__label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      @media (max-width: 767px) {
        .theme-color-trigger {
          width: 38px;
          height: 38px;
        }
      }
    `,
  ],
  imports: [NzIconModule, NzPopoverModule],
})
export class ThemeColorComponent {
  protected readonly themeColor = inject(ThemeColorService);
}
