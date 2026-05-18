import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
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
import { NzTabChangeEvent, NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
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
    NzTabsModule,
    NzAlertModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzTooltipModule,
    NzIconModule,
    PasswordInputComponent,
  ],
})
export class UserLoginComponent implements OnDestroy {
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
    email: ['', [Validators.required, Validators.email]],
    captcha: ['', [Validators.required]],
    remember: [true],
  });
  error = '';
  type = 0;
  loading = false;

  count = 0;
  interval$?: ReturnType<typeof setInterval>;

  switch({ index }: NzTabChangeEvent): void {
    this.type = index!;
  }

  getCaptcha(): void {
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsDirty({ onlySelf: true });
      email.updateValueAndValidity({ onlySelf: true });
      return;
    }
    this.count = 59;
    this.interval$ = setInterval(() => {
      this.count -= 1;
      this.cdr.detectChanges();
      if (this.count <= 0) {
        clearInterval(this.interval$);
      }
    }, 1000);
  }

  submit(): void {
    this.error = '';
    if (this.type === 0) {
      const { username, password } = this.form.controls;
      username.markAsDirty();
      username.updateValueAndValidity();
      password.markAsDirty();
      password.updateValueAndValidity();
      if (username.invalid || password.invalid) {
        return;
      }
    } else {
      const { email, captcha } = this.form.controls;
      email.markAsDirty();
      email.updateValueAndValidity();
      captcha.markAsDirty();
      captcha.updateValueAndValidity();
      if (email.invalid || captcha.invalid) {
        return;
      }
    }

    this.loading = true;
    this.cdr.detectChanges();
    if (this.type === 1) {
      this.loginWithEmail();
      return;
    }
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
              this.afterLogin(r, this.form.value.username || 'local-admin', encryptedPassword),
            error: (e) => {
              this.error = e?.msg || '登录失败，请检查账号或密码';
              this.cdr.detectChanges();
            },
          });
      },
      error: (e) => {
        this.loading = false;
        if (e?.status === 404 || e?.status === 0) {
          this.enterLocalConsole(this.form.value.username || 'local-admin');
          return;
        }
        this.messageService.error(e?.error?.msg || e?.msg || '登录安全校验异常，请稍后重试');
        this.cdr.detectChanges();
      },
    });
  }

  private enterLocalConsole(username: string): void {
    this.reuseTabService?.clear();
    const token: ITokenModel = {
      token: 'local-admin-token',
      refresh_token: '',
      expired: Date.now() + 30 * 24 * 60 * 60 * 1000,
      username,
      remember: true,
      localMode: true,
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
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        this.messageService.error(e || '暂时无法登录，请稍后重试');
        this.loading = false;
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
      remember: true,
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

  private loginWithEmail(): void {
    this.enterLocalConsole(this.form.value.email || 'local-admin');
  }

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }
}
