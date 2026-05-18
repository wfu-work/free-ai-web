import {
  EnvironmentProviders,
  Injectable,
  Provider,
  inject,
  provideAppInitializer,
} from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { ACLService } from '@delon/acl';
import { DA_SERVICE_TOKEN } from '@delon/auth';
import { CUSTOM_ERROR, MenuService, SettingsService, TitleService } from '@delon/theme';
import type { NzSafeAny } from 'ng-zorro-antd/core/types';
import { Observable, catchError, map, of } from 'rxjs';

/**
 * Used for application startup
 * Generally used to get the basic data of the application, like: Menu Data, User Data, etc.
 */
export function provideStartup(): Array<Provider | EnvironmentProviders> {
  return [
    StartupService,
    provideAppInitializer(() => {
      const initializerFn = (
        (startupService: StartupService) => () =>
          startupService.load()
      )(inject(StartupService));
      return initializerFn();
    }),
  ];
}

@Injectable()
export class StartupService {
  private http = inject(HttpClient);
  private menuService = inject(MenuService);
  private settingService = inject(SettingsService);
  private aclService = inject(ACLService);
  private titleService = inject(TitleService);
  private tokenService = inject(DA_SERVICE_TOKEN);

  private handleAppData(res: NzSafeAny): void {
    const token = this.tokenService.get();
    const fallbackName =
      token?.['username'] || token?.['name'] || 'guest';
    const user = {
      ...res,
      username: res.username || fallbackName,
      name: res.username || res.name || fallbackName,
      avatar: res.avatar || 'assets/avatar.gif',
      roleCodeList: res.roleCodeList ?? ['SUPER_ADMIN'],
      abilities: res.abilities ?? [],
    };
    this.settingService.setUser(user);
    this.aclService.setFull(false);
    this.aclService.set({
      role: user.roleCodeList,
      ability: user.abilities,
      except: false,
      mode: 'oneOf',
    });
    this.settingService.setApp({
      title: 'FreeAi',
      copyright: '武汉小兮科技',
      version: 'V1.0.0',
    });
    this.titleService.suffix = 'FreeAi';
  }

  private viaHttp(): Observable<void> {
    const token = this.tokenService.get();
    if (token?.['localMode']) {
      return of({}).pipe(
        map((appData: NzSafeAny) => {
          this.handleAppData(appData);
        }),
      );
    }

    return this.http
      .get<NzSafeAny>('/user', {
        context: new HttpContext().set(CUSTOM_ERROR, true),
      })
      .pipe(
        map((appData: NzSafeAny) => {
          this.handleAppData(appData ?? {});
        }),
        catchError(() => {
          this.handleAppData({});
          return of(void 0);
        }),
      );
  }

  load(): Observable<void> {
    return this.viaHttp();
  }
}
