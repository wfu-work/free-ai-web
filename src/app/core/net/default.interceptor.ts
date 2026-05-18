import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
  HttpResponseBase,
} from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { CUSTOM_ERROR, IGNORE_BASE_URL, RAW_BODY } from '@delon/theme';
import { environment } from '@env/environment';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { Observable, mergeMap, of, throwError } from 'rxjs';

import { ReThrowHttpError, getAdditionalHeaders, goTo, toLogin } from './helper';
import { tryRefreshToken } from './refresh-token';

type ApiResponseBody = Partial<{
  code: number;
  msg: string;
  data: unknown;
}>;

function handleData(
  injector: Injector,
  ev: HttpResponseBase,
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  switch (ev.status) {
    case 200:
      if (ev instanceof HttpResponse) {
        if (/assets\/i18n/.test(ev.url as string)) {
          return of(ev);
        }
        const body = ev.body as ApiResponseBody | Blob | null;
        if (body instanceof Blob) {
          return of(ev);
        }
        if (body && body.code !== 200) {
          const customError = req.context.get(CUSTOM_ERROR);
          if (!customError) injector.get(NzMessageService).error(body.msg ?? '请求失败');
          return !customError
            ? throwError(() => ({ ...body, _throw: true }) as ReThrowHttpError)
            : of();
        } else {
          if (req.context.get(RAW_BODY) || ev.body instanceof Blob) {
            return of(ev);
          }
          return of(
            new HttpResponse({
              body: body?.data,
              headers: ev.headers,
              status: ev.status,
              url: ev.url ?? undefined,
            }),
          );
        }
      }
      break;
    case 401:
      if (
        environment.api.refreshTokenEnabled &&
        environment.api.refreshTokenType === 're-request'
      ) {
        return tryRefreshToken(injector, ev, req, next);
      }
      toLogin(injector);
      break;
    case 403:
      injector.get(NzNotificationService).error(`系统错误`, `访问无权限`);
      break;
    case 404:
      if (!req.context.get(CUSTOM_ERROR)) {
        goTo(injector, `/exception/${ev.status}?url=${req.urlWithParams}`);
      }
      break;
    case 500:
      injector.get(NzNotificationService).error(`服务错误`, `服务不可用`);
      break;
    default:
      if (ev instanceof HttpErrorResponse) {
        console.warn(
          '未可知错误，大部分是由于后端不支持跨域CORS或无效配置引起，请参考 https://ng-alain.com/docs/server 解决跨域问题',
          ev,
        );
      }
      break;
  }
  if (ev instanceof HttpErrorResponse) {
    return throwError(() => ev);
  } else if ((ev as unknown as ReThrowHttpError)._throw === true) {
    return throwError(() => (ev as unknown as ReThrowHttpError).body);
  } else {
    return of(ev as HttpEvent<unknown>);
  }
}

export const defaultInterceptor: HttpInterceptorFn = (req, next) => {
  // 统一加上服务端前缀
  let url = req.url;
  if (
    !req.context.get(IGNORE_BASE_URL) &&
    !url.startsWith('https://') &&
    !url.startsWith('http://')
  ) {
    const { baseUrl } = environment.api;
    url = baseUrl + (baseUrl.endsWith('/') && url.startsWith('/') ? url.substring(1) : url);
  }
  const newReq = req.clone({ url, setHeaders: getAdditionalHeaders(req.headers) });
  const injector = inject(Injector);

  return next(newReq).pipe(
    mergeMap((ev) => {
      // 允许统一对请求错误处理
      if (ev instanceof HttpResponseBase) {
        return handleData(injector, ev, newReq, next);
      }
      // 若一切都正常，则后续操作
      return of(ev);
    }),
    // catchError((err: HttpErrorResponse) => handleData(injector, err, newReq, next))
  );
};
