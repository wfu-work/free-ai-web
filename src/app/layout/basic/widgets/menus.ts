import { Component, DestroyRef, EventEmitter, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { LogoComponent } from '@shared';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { filter } from 'rxjs';

import { ThemeColorService } from '../../../shared/services/theme-color.service';

export type NavigationKey =
  | 'dashboard'
  | 'accounts'
  | 'account-groups'
  | 'models'
  | 'access-keys'
  | 'access-guide'
  | 'request-logs'
  | 'usage'
  | 'tasks'
  | 'gateway-settings'
  | 'data-settings'
  | '';

interface NavigationItem {
  key: NavigationKey;
  title: string;
  icon: string;
  link: string;
}

interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: '运行概览',
    items: [{ key: 'dashboard', title: '工作台', icon: 'control', link: '/dashboard' }],
  },
  {
    label: '资源管理',
    items: [
      { key: 'accounts', title: '官方账号', icon: 'idcard', link: '/accounts/list' },
      {
        key: 'account-groups',
        title: '账号分组',
        icon: 'partition',
        link: '/accounts/groups',
      },
      { key: 'models', title: '模型目录', icon: 'deployment-unit', link: '/models/list' },
    ],
  },
  {
    label: '接入服务',
    items: [
      {
        key: 'access-keys',
        title: 'API 密钥',
        icon: 'safety-certificate',
        link: '/access/keys',
      },
      { key: 'access-guide', title: '接入指南', icon: 'read', link: '/access/guide' },
    ],
  },
  {
    label: '运行观测',
    items: [
      {
        key: 'request-logs',
        title: '调用记录',
        icon: 'file-search',
        link: '/request-logs/list',
      },
      { key: 'usage', title: '用量分析', icon: 'line-chart', link: '/usage' },
      { key: 'tasks', title: '任务中心', icon: 'schedule', link: '/ops/tasks' },
    ],
  },
  {
    label: '系统管理',
    items: [
      {
        key: 'gateway-settings',
        title: '网关设置',
        icon: 'gateway',
        link: '/settings/gateway',
      },
      { key: 'data-settings', title: '数据管理', icon: 'database', link: '/settings/retention' },
    ],
  },
];

export function resolveNavigationKey(url: string): NavigationKey {
  const path = url.split(/[?#]/, 1)[0];
  if (path.startsWith('/dashboard')) return 'dashboard';
  if (path.startsWith('/accounts/groups')) return 'account-groups';
  if (path.startsWith('/accounts')) return 'accounts';
  if (path.startsWith('/models')) return 'models';
  if (path.startsWith('/access/codex')) return 'access-keys';
  if (path.startsWith('/access/guide')) return 'access-guide';
  if (path.startsWith('/access/keys') || path === '/access') return 'access-keys';
  if (path.startsWith('/request-logs')) return 'request-logs';
  if (path.startsWith('/usage')) return 'usage';
  if (path.startsWith('/ops/tasks')) return 'tasks';
  if (path.startsWith('/settings/gateway') || path === '/settings') return 'gateway-settings';
  if (path.startsWith('/settings/retention')) return 'data-settings';
  return '';
}

@Component({
  selector: 'basic-menus',
  template: `
    <div class="sider-inner">
      <a routerLink="/dashboard" class="brand" aria-label="FreeAi 工作台" (click)="navigate.emit()">
        <span class="brand-heading">
          <logo class="brand-logo" />
          <span class="brand-name">FreeAi</span>
        </span>
        <span class="brand-description">统一管理 AI 账号、模型与调用</span>
      </a>

      <nav class="menu-scroll" aria-label="主导航">
        <ul
          class="menu-list"
          nz-menu
          [nzTheme]="themeColor.effectiveMode()"
          nzMode="inline"
          [nzInlineCollapsed]="false"
        >
          @for (group of navigationGroups; track group.label) {
            <li class="menu-section-label" aria-hidden="true">{{ group.label }}</li>
            @for (item of group.items; track item.key) {
              <li
                nz-menu-item
                [title]="item.title"
                [nzSelected]="activeKey === item.key"
                [routerLink]="item.link"
                [attr.aria-current]="activeKey === item.key ? 'page' : null"
                (click)="navigate.emit()"
              >
                <i nz-icon [nzType]="item.icon"></i>
                <span>{{ item.title }}</span>
              </li>
            }
          }
        </ul>
      </nav>
    </div>
  `,
  styles: [
    `
      :host {
        --menu-item-height: 42px;
        --menu-item-radius: 10px;

        display: flex;
        flex: 1;
        min-height: 0;
      }

      .sider-inner {
        display: flex;
        flex: 1;
        flex-direction: column;
        height: 100%;
        min-height: 0;
      }

      .brand {
        display: flex;
        flex: 0 0 auto;
        flex-direction: column;
        gap: 7px;
        align-items: flex-start;
        min-height: 86px;
        padding: 2px 10px 17px;
        border-bottom: 1px solid rgb(var(--nm-primary-rgb) / 9%);
        color: var(--nm-text);
        text-decoration: none;
      }

      .brand-heading {
        display: flex;
        gap: 10px;
        align-items: center;
        min-height: 45px;
      }

      .brand-logo {
        width: 36px;
        height: 36px;
        object-fit: contain;
        transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
      }

      .brand:hover .brand-logo {
        transform: translateY(-1px);
      }

      .brand-name {
        overflow: hidden;
        color: var(--nm-text);
        font-size: 1.25rem;
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: -0.025em;
        white-space: nowrap;
      }

      .brand-description {
        max-width: 100%;
        color: var(--nm-text-secondary);
        font-size: 0.6875rem;
        font-weight: 500;
        line-height: 1.45;
        letter-spacing: 0.015em;
      }

      .menu-scroll {
        scrollbar-width: none;
        overflow: hidden auto;
        overscroll-behavior: contain;
        flex: 1;
        min-height: 0;
        padding: 10px 0 12px;
        -webkit-overflow-scrolling: touch;
        -ms-overflow-style: none;
      }

      .menu-scroll::-webkit-scrollbar {
        display: none;
      }

      .menu-list {
        width: 100%;
        min-height: 100%;
        background: transparent;
      }

      .menu-section-label {
        display: block;
        height: auto;
        margin: 0;
        padding: 10px 14px 6px 8px;
        color: var(--nm-text-secondary);
        font-size: 0.6875rem;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: 0.075em;
        opacity: 0.82;
      }

      .menu-section-label:first-child {
        padding-top: 5px;
      }

      .menu-section-label:not(:first-child) {
        margin-top: 4px;
      }

      :host ::ng-deep {
        .menu-list.ant-menu,
        .menu-list.ant-menu-dark,
        .menu-list.ant-menu-light {
          background: transparent !important;
        }

        .menu-list .anticon {
          display: inline-flex;
          flex: 0 0 18px;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          margin-inline-end: 0 !important;
          color: var(--nm-text-secondary);
          font-size: 17px;
          transition:
            color 180ms ease,
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .ant-menu {
          color: var(--nm-text-secondary);
          font-size: 0.875rem;
        }

        .ant-menu-inline {
          border-inline-end: 0;
        }

        .ant-menu-inline .ant-menu-item {
          box-sizing: border-box;
          display: flex;
          gap: 11px;
          align-items: center;
          width: auto;
          height: var(--menu-item-height);
          margin: 1px 4px;
          padding-inline: 13px !important;
          border: 1px solid transparent;
          border-radius: var(--menu-item-radius);
          color: var(--nm-text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          line-height: var(--menu-item-height);
          letter-spacing: 0.005em;
          transition:
            border-color 180ms ease,
            background-color 180ms ease,
            color 180ms ease,
            transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 180ms ease;
        }

        .ant-menu-inline .ant-menu-item::after {
          display: none;
        }

        .ant-menu-inline .ant-menu-item .ant-menu-title-content {
          overflow: hidden;
          flex: 1;
          margin-inline-start: 0;
          text-overflow: ellipsis;
        }

        .ant-menu-inline .ant-menu-item:hover {
          color: var(--nm-text);
          background: rgb(var(--nm-primary-rgb) / 5%);
          transform: translateX(2px);
        }

        .ant-menu-inline .ant-menu-item:hover .anticon {
          color: var(--nm-primary);
        }

        .ant-menu-inline .ant-menu-item:focus-visible {
          outline: 2px solid rgb(var(--nm-primary-rgb) / 32%);
          outline-offset: 1px;
        }

        .ant-menu-inline .ant-menu-item-selected {
          border-color: rgb(var(--nm-primary-rgb) / 13%);
          color: color-mix(in srgb, var(--nm-primary) 82%, var(--nm-text)) !important;
          background: var(--nm-primary-soft) !important;
          box-shadow:
            inset 0 1px 0 rgb(255 255 255 / 32%),
            0 5px 14px rgb(var(--nm-primary-rgb) / 8%);
          font-weight: 600;
          transform: none;
        }

        .ant-menu-inline .ant-menu-item-selected::before {
          position: absolute;
          top: 50%;
          right: 12px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--nm-primary);
          box-shadow: 0 0 0 4px rgb(var(--nm-primary-rgb) / 9%);
          content: '';
          transform: translateY(-50%);
        }

        .ant-menu-inline .ant-menu-item-selected .anticon {
          color: var(--nm-primary) !important;
          transform: scale(1.04);
        }
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .brand {
        flex-direction: row;
        justify-content: center;
        align-items: center;
        min-height: 58px;
        padding: 0 0 14px;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .brand-logo {
        width: 34px;
        height: 34px;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .brand-name,
      :host-context(.app-sider.ant-layout-sider-collapsed) .brand-description,
      :host-context(.app-sider.ant-layout-sider-collapsed) .menu-section-label {
        display: none;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .menu-scroll {
        padding-top: 10px;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) ::ng-deep {
        .menu-list {
          width: 50px;
          margin-inline: auto;
        }

        .ant-menu-inline .ant-menu-item {
          justify-content: center;
          width: 46px;
          height: 44px;
          margin: 2px 0;
          padding-inline: 0 !important;
          border-radius: 10px;
          transform: none;
        }

        .ant-menu-inline .ant-menu-item .anticon {
          margin: 0 !important;
          font-size: 16px;
        }

        .ant-menu-inline .ant-menu-item .ant-menu-title-content {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .ant-menu-inline .ant-menu-item .ant-menu-title-content > span:not(.anticon) {
          display: none !important;
        }

        .ant-menu-inline .ant-menu-item-selected::before {
          right: 5px;
          width: 4px;
          height: 4px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .brand-logo {
          transition: none;
        }

        :host ::ng-deep .ant-menu-inline .ant-menu-item,
        :host ::ng-deep .menu-list .anticon {
          transition: none;
        }
      }
    `,
  ],
  imports: [RouterLink, LogoComponent, NzIconModule, NzMenuModule],
})
export class BasicMenusComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly themeColor = inject(ThemeColorService);

  @Output() readonly navigate = new EventEmitter<void>();

  protected readonly navigationGroups = NAVIGATION_GROUPS;
  protected activeKey: NavigationKey = resolveNavigationKey(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.activeKey = resolveNavigationKey(event.urlAfterRedirects);
      });
  }
}
