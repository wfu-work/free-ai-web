import { Component, inject } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';

import { ThemeColorService, ThemeMode } from '../../../shared/services/theme-color.service';

const THEME_MODE_ICONS: Record<ThemeMode, string> = {
  light: 'sun',
  dark: 'moon',
  system: 'desktop',
};

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
      [attr.aria-label]="'外观设置：' + currentModeLabel + '，' + themeColor.current().label"
      title="外观设置"
    >
      <i nz-icon nzType="bg-colors"></i>
      <span
        class="theme-color-trigger__swatch"
        [style.background]="themeColor.current().primary"
      ></span>
    </button>

    <ng-template #themePanel>
      <div class="theme-color-panel">
        <div class="theme-color-panel__title">外观模式</div>
        <div class="theme-mode-options" role="radiogroup" aria-label="外观模式">
          @for (mode of themeColor.modes; track mode.key) {
            <button
              type="button"
              class="theme-mode-option"
              role="radio"
              [class.theme-mode-option-active]="themeColor.currentMode() === mode.key"
              [attr.aria-checked]="themeColor.currentMode() === mode.key"
              (click)="themeColor.applyMode(mode.key)"
            >
              <i nz-icon [nzType]="modeIcons[mode.key]"></i>
              <span>{{ mode.label }}</span>
            </button>
          }
        </div>

        <div class="theme-color-panel__divider"></div>
        <div class="theme-color-panel__title theme-color-panel__color-title">主题颜色</div>
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
        color: var(--nm-text-secondary);
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
        border: 2px solid var(--nm-surface-raised);
        border-radius: 50%;
        box-shadow: 0 2px 5px rgb(25 39 52 / 18%);
      }

      .theme-color-panel {
        width: 276px;
        padding: 4px;
      }

      .theme-color-panel__title {
        padding: 4px 4px 10px;
        font-size: 13px;
        font-weight: 700;
        color: var(--nm-text);
      }

      .theme-mode-options {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 4px;
        padding: 4px;
        border: 1px solid var(--nm-border);
        border-radius: 8px;
        background: var(--nm-surface-muted);
      }

      .theme-mode-option {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-width: 0;
        height: 38px;
        padding: 0 7px;
        border: 0;
        border-radius: 6px;
        color: var(--nm-text-secondary);
        font-size: 12px;
        font-weight: 650;
        line-height: 1;
        white-space: nowrap;
        background: transparent;
        cursor: pointer;
        transition:
          color 0.2s ease,
          background-color 0.2s ease,
          box-shadow 0.2s ease;
      }

      .theme-mode-option .anticon {
        flex: 0 0 auto;
        font-size: 15px;
      }

      .theme-mode-option:hover {
        color: var(--nm-text);
        background: rgb(var(--nm-primary-rgb) / 8%);
      }

      .theme-mode-option-active {
        color: var(--nm-primary);
        background: var(--nm-surface-raised);
        box-shadow: var(--nm-control-shadow);
      }

      .theme-color-panel__divider {
        height: 1px;
        margin: 14px 4px 10px;
        background: var(--nm-border);
      }

      .theme-color-panel__color-title {
        padding-bottom: 8px;
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
        border-radius: 7px;
        color: var(--nm-text-secondary);
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
        color: var(--nm-text);
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
  protected readonly modeIcons = THEME_MODE_ICONS;

  protected get currentModeLabel(): string {
    return (
      this.themeColor.modes.find((mode) => mode.key === this.themeColor.currentMode())?.label ??
      '跟随系统'
    );
  }
}
