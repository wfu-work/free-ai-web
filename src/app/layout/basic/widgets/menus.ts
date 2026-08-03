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
  | 'security-settings'
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
    label: '概览',
    items: [{ key: 'dashboard', title: '工作台', icon: 'dashboard', link: '/dashboard' }],
  },
  {
    label: '资源',
    items: [
      { key: 'accounts', title: '官方账号', icon: 'team', link: '/accounts/list' },
      { key: 'account-groups', title: '账号分组', icon: 'cluster', link: '/accounts/groups' },
      { key: 'models', title: '模型目录', icon: 'api', link: '/models/list' },
    ],
  },
  {
    label: '服务',
    items: [
      { key: 'access-keys', title: 'API 密钥', icon: 'key', link: '/access/keys' },
      { key: 'access-guide', title: '接入指南', icon: 'link', link: '/access/guide' },
    ],
  },
  {
    label: '观测',
    items: [
      { key: 'request-logs', title: '调用记录', icon: 'history', link: '/request-logs/list' },
      { key: 'usage', title: '用量分析', icon: 'bar-chart', link: '/usage' },
      { key: 'tasks', title: '任务中心', icon: 'schedule', link: '/ops/tasks' },
    ],
  },
  {
    label: '系统',
    items: [
      { key: 'gateway-settings', title: '网关设置', icon: 'global', link: '/settings/gateway' },
      {
        key: 'security-settings',
        title: '安全设置',
        icon: 'safety-certificate',
        link: '/settings/security',
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
  if (path.startsWith('/settings/security')) return 'security-settings';
  if (path.startsWith('/settings/retention')) return 'data-settings';
  return '';
}

@Component({
  selector: 'basic-menus',
  template: `
    <div class="sider-inner">
      <a routerLink="/dashboard" class="brand" aria-label="FreeAi 工作台" (click)="navigate.emit()">
        <logo class="brand-logo" />
        <span class="brand-name">FreeAi</span>
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
        gap: 8px;
        align-items: center;
        min-height: 50px;
        padding: 0 8px 8px;
        color: var(--nm-text);
        text-decoration: none;
      }

      .brand-logo {
        width: 38px;
        height: 38px;
        object-fit: contain;
        transition: transform 0.2s ease;
      }

      .brand:hover .brand-logo {
        transform: translateY(-1px);
      }

      .brand-name {
        overflow: hidden;
        font-size: 21px;
        font-weight: 720;
        letter-spacing: 0;
        white-space: nowrap;
      }

      .menu-scroll {
        scrollbar-width: none;
        overflow: hidden auto;
        overscroll-behavior: contain;
        flex: 1;
        min-height: 0;
        padding-top: 15px;
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
        height: 23px;
        padding: 5px 12px 2px;
        color: var(--nm-text-secondary);
        font-size: 11px;
        font-weight: 700;
        line-height: 16px;
        letter-spacing: 0;
      }

      :host ::ng-deep {
        .menu-list .anticon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          color: var(--nm-text-secondary);
          font-size: 16px;
          transition: color 0.2s ease;
        }

        .ant-menu {
          color: var(--nm-text-secondary);
          font-size: 14px;
        }

        .ant-menu-inline {
          border-inline-end: 0;
        }

        .ant-menu-inline .ant-menu-item {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          width: auto;
          height: 40px;
          margin: 1px 3px;
          padding-inline: 12px !important;
          border-radius: 7px;
          color: var(--nm-text-secondary);
          font-size: 14px;
          font-weight: 620;
          line-height: 40px;
          transition:
            background-color 0.2s ease,
            color 0.2s ease;
        }

        .ant-menu-inline .ant-menu-item::after {
          display: none;
        }

        .ant-menu-inline .ant-menu-item:hover {
          color: var(--nm-text);
          background: rgb(var(--nm-primary-rgb) / 6%);
        }

        .ant-menu-inline .ant-menu-item-selected {
          color: #fff !important;
          background: var(--nm-primary) !important;
          box-shadow: 0 6px 14px rgb(var(--nm-primary-rgb) / 16%);
        }

        .ant-menu-inline .ant-menu-item-selected .anticon {
          color: #fff !important;
        }
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .brand {
        justify-content: center;
        padding-inline: 0;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .brand-logo {
        width: 38px;
        height: 38px;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .brand-name,
      :host-context(.app-sider.ant-layout-sider-collapsed) .menu-section-label {
        display: none;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) .menu-scroll {
        padding-top: 8px;
      }

      :host-context(.app-sider.ant-layout-sider-collapsed) ::ng-deep {
        .menu-list {
          width: 48px;
          margin-inline: auto;
        }

        .ant-menu-inline .ant-menu-item {
          justify-content: center;
          width: 48px;
          height: 44px;
          margin: 2px 0;
          padding-inline: 0 !important;
          border-radius: 8px;
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
