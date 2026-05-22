import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { SettingsService, User } from '@delon/theme';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';

@Component({
  selector: 'header-avatar',
  template: `
    <div
      class="d-flex align-items-center px-sm"
      nz-dropdown
      nzPlacement="bottomRight"
      [nzDropdownMenu]="userMenu"
    >
      <nz-avatar
        [nzSrc]="user.avatar || 'assets/avatar.gif'"
        nzSize="default"
        nzShape="circle"
        class="mr-sm"
      />
      <span class="font-weight-bold text-lg">{{ user.name || user['username'] || 'admin' }}</span>
    </div>
    <nz-dropdown-menu #userMenu="nzDropdownMenu">
      <div nz-menu class="width-sm">
        <div nz-menu-item routerLink="/settings/mine">
          <i nz-icon nzType="user" class="mr-sm"></i>
          个人中心
        </div>
        <div nz-menu-item routerLink="/settings/security">
          <i nz-icon nzType="safety-certificate" class="mr-sm"></i>
          安全设置
        </div>
        <li nz-menu-divider></li>
        <div nz-menu-item (click)="logout()">
          <i nz-icon nzType="logout" class="mr-sm"></i>
          退出登录
        </div>
      </div>
    </nz-dropdown-menu>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterLink, NzDropdownModule, NzMenuModule, NzIconModule, NzAvatarModule],
})
export class AvatarComponent {
  protected readonly user = inject(SettingsService).user as User & { username?: string };
  private readonly router = inject(Router);
  private readonly tokenService: ITokenService = inject(DA_SERVICE_TOKEN);

  protected logout(): void {
    this.tokenService.clear();
    this.router.navigateByUrl(this.tokenService.login_url!);
  }
}
