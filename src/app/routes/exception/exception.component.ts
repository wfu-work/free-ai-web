import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LogoComponent } from '@shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

type ExceptionCode = 403 | 404 | 500;

interface ExceptionView {
  accent: string;
  accentSoft: string;
  description: string;
  icon: string;
  label: string;
  scope: string;
  status: string;
  title: string;
}

const EXCEPTION_VIEWS: Record<ExceptionCode, ExceptionView> = {
  403: {
    accent: '#d97706',
    accentSoft: '#fff7e6',
    description: '当前登录账号没有此页面的访问权限。请返回上一页，或回到工作台检查账号与安全设置。',
    icon: 'safety-certificate',
    label: '权限校验未通过',
    scope: '访问策略',
    status: 'ACCESS_RESTRICTED',
    title: '当前账号无权访问',
  },
  404: {
    accent: '#3448f4',
    accentSoft: '#eef3ff',
    description: '地址可能已经调整或删除。你可以返回上一页，或回到工作台继续管理官方账号池。',
    icon: 'search',
    label: '访问路径不存在',
    scope: '控制台路由',
    status: 'ROUTE_NOT_FOUND',
    title: '这条访问路径不存在',
  },
  500: {
    accent: '#c24141',
    accentSoft: '#fff1f0',
    description:
      'FreeAi 控制台遇到暂时性异常。请重新加载页面；如果问题持续，可以回到工作台检查网关状态。',
    icon: 'tool',
    label: '控制台响应异常',
    scope: '服务进程',
    status: 'SERVICE_UNAVAILABLE',
    title: '服务暂时无法响应',
  },
};

@Component({
  selector: 'app-exception',
  templateUrl: './exception.component.html',
  styleUrls: ['./exception.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoComponent, NzButtonModule, NzIconModule],
})
export class ExceptionComponent {
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected get type(): ExceptionCode {
    return (this.route.snapshot.data['type'] || 404) as ExceptionCode;
  }

  protected get view(): ExceptionView {
    return EXCEPTION_VIEWS[this.type] || EXCEPTION_VIEWS[404];
  }

  protected goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl('/dashboard');
  }

  protected reloadPage(): void {
    window.location.reload();
  }
}
