import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import screenfull from 'screenfull';

@Component({
  selector: 'header-fullscreen',
  template: `
    @let s = status();
    <nz-icon [nzType]="s ? 'fullscreen-exit' : 'fullscreen'" />
    {{ s ? '退出全屏' : '全屏' }}
  `,
  host: {
    class: 'flex-1',
    '(window:resize)': '_resize()',
    '(click)': '_click()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NzIconModule],
})
export class HeaderFullScreen {
  protected status = signal(false);

  protected _resize(): void {
    this.status.set(screenfull.isFullscreen);
  }

  protected _click(): void {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  }
}
