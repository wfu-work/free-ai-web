import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalFooterModule } from '@delon/abc/global-footer';
import { DA_SERVICE_TOKEN } from '@delon/auth';
import { LogoComponent } from '@shared';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'layout-passport',
  template: `
    <div class="container">
      <div class="wrap">
        <div class="top">
          <div class="head">
            <logo class="logo" />
            <span class="title">FreeAi</span>
          </div>
          <div class="desc">边缘设备远程接入控制台</div>
        </div>
        <router-outlet />
        <global-footer [links]="links">
          Copyright
          <i class="anticon anticon-copyright"></i> 2020-{{ year }}
          <a href="//www.github.com" target="_blank">武汉小兮科技</a>
        </global-footer>
      </div>
    </div>
  `,
  styleUrls: ['./passport.less'],
  imports: [RouterOutlet, GlobalFooterModule, LogoComponent, NzIconModule],
})
export class LayoutPassport {
  private tokenSrv = inject(DA_SERVICE_TOKEN);
  year = new Date().getFullYear();

  links = [
    {
      title: '帮助',
      href: '',
    },
    {
      title: '隐私',
      href: '',
    },
    {
      title: '条款',
      href: '',
    },
  ];

  constructor() {
    this.tokenSrv.clear();
  }
}
