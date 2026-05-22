import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { DA_SERVICE_TOKEN, ITokenService } from '@delon/auth';
import { SettingsService, User } from '@delon/theme';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { finalize, forkJoin, switchMap } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-settings-mine',
  templateUrl: './settings-mine.component.html',
  styleUrls: ['./settings-mine.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SettingsMineComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly message = inject(NzMessageService);
  private readonly settingsService = inject(SettingsService);
  private readonly tokenService: ITokenService = inject(DA_SERVICE_TOKEN);

  protected saving = false;
  protected readonly user = this.settingsService.user as User & { username?: string; email?: string };
  protected readonly passwordRules = [
    '建议至少 8 位，并混合大小写字母、数字或符号。',
    '不要复用平台密钥、上游账号 Secret 或其他系统密码。',
    '修改密码后会清除当前登录态，需要立即重新登录。',
  ];
  protected readonly securityTips = [
    {
      title: '后台登录密码',
      desc: '用于进入 FreeAi 管理台，和平台密钥不是同一套鉴权。',
    },
    {
      title: '平台密钥',
      desc: '用于业务客户端访问 /v1 网关，不应该作为后台登录密码使用。',
    },
    {
      title: '上游账号 Secret',
      desc: '只保存在后端加密字段中，前端不会回显原始 Secret。',
    },
  ];

  protected readonly form = this.fb.nonNullable.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected get username(): string {
    const token = this.tokenService.get() as { username?: string } | null;
    return this.user.name || this.user.username || token?.username || 'admin';
  }

  protected get userEmail(): string {
    return this.user.email || '-';
  }

  protected get accountInitial(): string {
    return this.username.slice(0, 1).toUpperCase();
  }

  protected savePassword(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    const value = this.form.getRawValue();
    if (this.form.invalid) return;
    if (value.newPassword !== value.confirmPassword) {
      this.form.controls.confirmPassword.setErrors({ mismatch: true });
      this.message.warning('两次输入的新密码不一致');
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    forkJoin({
      oldPassword: this.http.post<string>('/secret/encrypt', value.oldPassword),
      newPassword: this.http.post<string>('/secret/encrypt', value.newPassword),
    })
      .pipe(
        switchMap(({ oldPassword, newPassword }) =>
          this.http.put<boolean>('/user/update/password', {
            oldPassword,
            newPassword,
          }),
        ),
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.message.success('密码已修改，请使用新密码重新登录');
          this.tokenService.clear();
          this.router.navigateByUrl(this.tokenService.login_url || '/passport/login');
        },
        error: (error) => {
          this.message.error(error?.msg || error?.error?.msg || '密码修改失败，请确认当前密码是否正确');
        },
      });
  }
}
