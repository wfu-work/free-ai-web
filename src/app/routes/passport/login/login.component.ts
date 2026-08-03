import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StartupService } from '@core';
import { ReuseTabService } from '@delon/abc/reuse-tab';
import { DA_SERVICE_TOKEN, ITokenModel } from '@delon/auth';
import { _HttpClient } from '@delon/theme';
import { PasswordInputComponent } from '@shared';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

interface LoginResponse {
  token?: string;
  refreshToken?: string;
  expired?: number;
  message?: string;
}

@Component({
  selector: 'passport-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NzCheckboxModule,
    NzAlertModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    PasswordInputComponent,
  ],
})
export class UserLoginComponent {
  private readonly router = inject(Router);
  private readonly reuseTabService = inject(ReuseTabService, { optional: true });
  private readonly tokenService = inject(DA_SERVICE_TOKEN);
  private readonly startupSrv = inject(StartupService);
  private readonly http = inject(_HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly messageService = inject(NzMessageService);

  form = inject(FormBuilder).nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
  });
  error = '';
  loading = false;

  submit(): void {
    this.error = '';
    const { username, password } = this.form.controls;
    username.markAsDirty();
    username.updateValueAndValidity();
    password.markAsDirty();
    password.updateValueAndValidity();
    if (username.invalid || password.invalid) {
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();
    this.loginWithPassword();
  }

  private loginWithPassword(): void {
    this.http.post<string>('/secret/encrypt', this.form.value.password).subscribe({
      next: (encryptedPassword) => {
        this.http
          .post('/login/in', {
            username: this.form.value.username,
            password: encryptedPassword,
          })
          .pipe(
            finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();
            }),
          )
          .subscribe({
            next: (r: LoginResponse) =>
              this.afterLogin(r, this.form.value.username || 'admin', encryptedPassword),
            error: (e) => {
              this.error = e?.msg || '登录失败，请检查账号或密码';
              this.cdr.detectChanges();
            },
          });
      },
      error: (e) => {
        this.loading = false;
        this.messageService.error(e?.error?.msg || e?.msg || '登录安全校验异常，请稍后重试');
        this.cdr.detectChanges();
      },
    });
  }

  private afterLogin(r: LoginResponse, username: string, encryptedPassword?: string): void {
    if (!r?.token) {
      this.error = r?.message || '登录失败，请检查账号或密码';
      this.cdr.detectChanges();
      return;
    }
    this.reuseTabService?.clear();
    const token: ITokenModel = {
      token: r.token,
      refresh_token: r.refreshToken,
      expired: Date.now() + (r.expired ?? 7 * 24 * 60 * 60) * 1000,
      username,
      password: encryptedPassword,
      remember: this.form.controls.remember.value,
    };
    this.tokenService.set(token);
    this.startupSrv.load().subscribe({
      next: () => {
        let url = this.tokenService.referrer?.url || '/';
        if (url.includes('/passport')) {
          url = '/';
        }
        this.router.navigateByUrl(url);
        this.messageService.success('已进入 FreeAi 管理台');
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.messageService.error(e || '暂时无法登录，请稍后重试');
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
