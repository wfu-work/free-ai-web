import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzModalService } from 'ng-zorro-antd/modal';

import { BasicHeaderComponent } from './widgets/header';
import { BasicMenusComponent } from './widgets/menus';

@Component({
  selector: 'layout-basic',
  templateUrl: './basic.component.html',
  styleUrls: ['./basic.component.less'],
  imports: [RouterOutlet, NgClass, NzLayoutModule, BasicHeaderComponent, BasicMenusComponent],
})
export class LayoutBasic {
  private readonly modalSrv = inject(NzModalService);
  private readonly router = inject(Router);
  private readonly tokenService: ITokenService = inject(DA_SERVICE_TOKEN);

  protected isCollapsed = false;
  protected spin = false;

  protected nzCollapsedChange(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  protected setLoadResources(load: boolean): void {
    this.spin = load;
  }

  protected logout(): void {
    this.modalSrv.confirm({
      nzTitle: '提示',
      nzContent: '确定要退出登录吗？',
      nzCancelDisabled: false,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.tokenService.clear();
        this.router.navigateByUrl(this.tokenService.login_url!);
      },
    });
  }
}
