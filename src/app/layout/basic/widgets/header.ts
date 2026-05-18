import {
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
        border-radius: 22px;
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @Output() public readonly collapsClick = new EventEmitter<boolean>();

  @Input() isCollapsed = false;

  protected pageTitle = 'FreeAi';
  protected hasScrolled = false;

  ngOnInit(): void {
    this.updatePageTitle();
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

  private updatePageTitle(): void {
    let route = this.route;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.pageTitle = route.snapshot.data['title'] || 'FreeAi';
  }
}
