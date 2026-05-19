import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { LayoutDefaultModule } from '@delon/theme/layout-default';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { filter } from 'rxjs';

import { AvatarComponent } from './avatar';
import { HeaderMessage } from './message';
import { ThemeColorComponent } from './theme-color';

@Component({
  selector: 'basic-header',
  template: `
    <div
      class="header-container"
      [class.header-container-collapsed]="isCollapsed"
      [class.header-container-scrolled]="hasScrolled"
    >
      <div class="header-left">
        <span
          class="trigger"
          nz-icon
          [nzType]="isCollapsed ? 'menu-unfold' : 'menu-fold'"
          (click)="collapsTap()"
        ></span>
        <span class="font-weight-bold text-xl title">{{ pageTitle }}</span>
        <button
          type="button"
          class="gateway-status"
          [class.gateway-status-ok]="gatewayStatus === 'ok'"
          [class.gateway-status-error]="gatewayStatus === 'error'"
          [class.gateway-status-checking]="gatewayStatus === 'checking'"
          [title]="gatewayStatusTitle"
          (click)="checkGatewayHealth()"
        >
          <i nz-icon [nzType]="gatewayStatusIcon" [nzSpin]="gatewayStatus === 'checking'"></i>
          <span>{{ gatewayStatusText }}</span>
        </button>
      </div>
      <div class="header-actions">
        <theme-color />
        <header-message class="mr-md" />
        <header-avatar />
      </div>
    </div>
  `,
  styles: [
    `
      .header-container {
        position: fixed;
        top: var(--basic-header-top, 14px);
        right: var(--basic-layout-gap, 14px);
        left: calc(var(--basic-sider-width, 220px) + var(--basic-layout-gap, 14px) * 2);
        z-index: 999;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 68px;
        padding: 10px 18px;
        border: 1px solid transparent;
        border-radius: 8px;
        background: transparent;
        box-shadow: none;
        backdrop-filter: none;
        transition:
          border-color 0.2s ease,
          box-shadow 0.2s ease,
          background-color 0.2s ease,
          backdrop-filter 0.2s ease,
          left 0.2s ease;
      }

      .header-container-scrolled {
        border-color: rgb(255 255 255 / 74%);
        background: rgb(255 255 255 / 82%);
        box-shadow:
          0 12px 32px rgb(41 99 119 / 10%),
          inset 0 1px 0 rgb(255 255 255 / 88%);
        backdrop-filter: blur(18px);
      }

      .header-container-collapsed {
        left: calc(var(--basic-sider-collapsed-width, 80px) + var(--basic-layout-gap, 14px) * 2);
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        white-space: nowrap;
      }

      .trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 42px;
        height: 42px;
        border: 1px solid rgb(var(--nm-primary-rgb) / 10%);
        border-radius: 14px;
        color: var(--nm-primary);
        font-size: 18px;
        background: rgb(var(--nm-primary-rgb) / 8%);
        cursor: pointer;
        transition:
          color 0.2s ease,
          background-color 0.2s ease,
          transform 0.2s ease;
      }

      .trigger:hover {
        transform: translateY(-1px);
        color: var(--nm-primary-active);
        background: rgb(var(--nm-primary-rgb) / 14%);
      }

      .title {
        color: var(--nm-primary);
      }

      .gateway-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 30px;
        padding: 0 12px;
        border: 1px solid rgb(148 163 184 / 24%);
        border-radius: 999px;
        color: #64748b;
        font-size: 13px;
        font-weight: 760;
        line-height: 1;
        white-space: nowrap;
        background: rgb(255 255 255 / 70%);
        cursor: pointer;
        transition:
          border-color 0.2s ease,
          color 0.2s ease,
          background-color 0.2s ease,
          transform 0.2s ease;
      }

      .gateway-status:hover {
        transform: translateY(-1px);
      }

      .gateway-status-ok {
        border-color: rgb(20 148 112 / 18%);
        color: #14856e;
        background: rgb(20 148 112 / 8%);
      }

      .gateway-status-error {
        border-color: rgb(194 65 65 / 18%);
        color: #c24141;
        background: rgb(194 65 65 / 8%);
      }

      .gateway-status-checking {
        border-color: rgb(183 121 31 / 18%);
        color: #b7791f;
        background: rgb(183 121 31 / 8%);
      }

      .header-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        min-width: 0;
        color: #56657d;
      }

      .header-actions > * {
        display: inline-flex;
        align-items: center;
      }

      .header-actions .mr-md {
        margin-right: 0 !important;
      }

      @media (max-width: 767px) {
        .header-container,
        .header-container-collapsed {
          top: 12px;
          right: 12px;
          left: 12px;
          min-height: 60px;
          padding: 8px 12px;
          border-radius: 18px;
        }

        .trigger {
          width: 38px;
          height: 38px;
        }

        .gateway-status span {
          display: none;
        }

        .gateway-status {
          width: 34px;
          justify-content: center;
          padding: 0;
        }

        .header-actions {
          gap: 8px;
        }
      }
    `,
  ],
  standalone: true,
  imports: [AvatarComponent, HeaderMessage, LayoutDefaultModule, NzIconModule, ThemeColorComponent],
})
export class BasicHeaderComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private gatewayHealthTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  @Output() public readonly collapsClick = new EventEmitter<boolean>();

  @Input() isCollapsed = false;

  protected pageTitle = 'FreeAi';
  protected hasScrolled = false;
  protected gatewayStatus: 'checking' | 'ok' | 'error' = 'checking';
  protected gatewayCheckedAt = 0;
  protected gatewayStatusTitle = '检查中，最后检查：尚未完成';

  ngOnInit(): void {
    this.updatePageTitle();
    this.checkGatewayHealth();
    this.gatewayHealthTimer = setInterval(() => this.checkGatewayHealth(), 30000);
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      if (this.gatewayHealthTimer) {
        clearInterval(this.gatewayHealthTimer);
      }
    });
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.updatePageTitle();
      });
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.hasScrolled = window.scrollY > 8 || document.documentElement.scrollTop > 8;
  }

  protected collapsTap(): void {
    this.isCollapsed = !this.isCollapsed;
    this.collapsClick.emit(this.isCollapsed);
  }

  protected async checkGatewayHealth(): Promise<void> {
    if (this.gatewayStatus === 'checking' && this.gatewayCheckedAt > 0) return;
    this.gatewayStatus = 'checking';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch('/api/ops/metrics', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json().catch(() => null)) as Partial<{
        code: number;
        data: Partial<{ ok: boolean }>;
        ok: boolean;
      }> | null;
      const ok = body?.data?.ok ?? body?.ok ?? response.ok;
      this.gatewayStatus = ok ? 'ok' : 'error';
    } catch {
      this.gatewayStatus = 'error';
    } finally {
      clearTimeout(timer);
      this.gatewayCheckedAt = Date.now();
      this.gatewayStatusTitle = this.buildGatewayStatusTitle();
      this.detectGatewayStatusChanges();
    }
  }

  protected get gatewayStatusText(): string {
    switch (this.gatewayStatus) {
      case 'ok':
        return '网关正常';
      case 'error':
        return '网关异常';
      default:
        return '检查中';
    }
  }

  protected get gatewayStatusIcon(): string {
    switch (this.gatewayStatus) {
      case 'ok':
        return 'check-circle';
      case 'error':
        return 'close-circle';
      default:
        return 'loading';
    }
  }

  private buildGatewayStatusTitle(): string {
    const checkedAt = this.gatewayCheckedAt ? new Date(this.gatewayCheckedAt).toLocaleTimeString('zh-CN', { hour12: false }) : '尚未完成';
    return `${this.gatewayStatusText}，最后检查：${checkedAt}`;
  }

  private detectGatewayStatusChanges(): void {
    if (this.destroyed) return;
    this.cdr.detectChanges();
  }

  private updatePageTitle(): void {
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.pageTitle = route.snapshot.data['title'] || 'FreeAi';
  }
}
