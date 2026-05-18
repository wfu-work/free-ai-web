import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { RAW_BODY } from '@delon/theme';
import { Observable } from 'rxjs';

/**
 * 文件上传服务
 *
 * @export
 * @class CustomerService
 */
@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly http = inject(HttpClient);

  /**
   * 单文件上传
   *
   * @param {*} file
   * @returns {Observable<string>}
   * @memberof CustomerService
   */
  upload(file: any): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<string>(`/oss/upload`, formData);
  }

  download(path: string): Observable<HttpResponse<Blob>> {
    return this.http.get('/file/download', {
      params: { path },
      observe: 'response',
      responseType: 'blob',
      context: new HttpContext().set(RAW_BODY, true),
    });
  }

  downloadInfo(path: string): Observable<HttpResponse<Blob>> {
    return this.http.head('/file/download', {
      params: { path },
      observe: 'response',
      responseType: 'blob',
      context: new HttpContext().set(RAW_BODY, true),
    });
  }
}
