import { Component, forwardRef, inject, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { getBase64 } from '@shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule, NzImageService } from 'ng-zorro-antd/image';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { Observable } from 'rxjs';

import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.less'],
  imports: [NzUploadModule, NzIconModule, NzImageModule, NzPopoverModule, NzButtonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UploadComponent),
      multi: true,
    },
  ],
})
export class UploadComponent implements ControlValueAccessor {
  private nzImageService = inject(NzImageService);
  private message = inject(NzMessageService);
  private fileService = inject(FileService);

  /**
   * 业务guid
   *
   * @type {(string | null)}
   * @memberof UploadComponent
   */
  @Input() guid?: string | null;

  /**
   * 文件数据
   *
   * @type {any[]}
   * @memberof UploadComponent
   */
  _url!: string;

  /**
   * 文件数据
   *
   * @type {any[]}
   * @memberof UploadComponent
   */
  file: any;

  /**
   * 加载状态
   *
   * @memberof UploadComponent
   */
  loading = false;

  get url() {
    return this._url;
  }

  set url(val: string) {
    if (this._url !== val) {
      this._url = val;
      this.propagateChange(val);
    }
  }

  propagateChange = (_: any) => {};

  writeValue(val: any): void {
    if (val && null != val) {
      this._url = val;
      this.file = {
        uid: val,
        name: val,
        status: 'done',
        url: val,
        response: val,
      };
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(): void {}

  setDisabledState?(): void {}

  /**
   * 构造函数
   *
   * @param {NzMessageService} message
   * @param {FileService} fileService
   * @memberof UploadComponent
   */
  constructor() {}

  /**
   * 预览
   *
   * @type {(string | undefined)}
   * @memberof UploadComponent
   */
  previewImage: string | undefined = '';
  previewVisible = false;
  handlePreview = async (file: NzUploadFile): Promise<void> => {
    if (!file.url && !file['preview']) {
      file['preview'] = await getBase64(file.originFileObj!);
    }
    this.previewImage = file.url || file['preview'];
    this.previewVisible = true;
  };

  /**
   * 上传文件
   *
   * @param {NzUploadXHRArgs} item
   * @memberof EditComponent
   */
  customRequest = (item: NzUploadXHRArgs) => {
    this.loading = true;
    let obs: Observable<any>;
    if (this.guid) {
      obs = this.fileService.upload(item.file);
    } else {
      obs = this.fileService.upload(item.file);
    }
    return obs.subscribe({
      next: (r) => {
        this.loading = false;
        item.onSuccess!(
          r,
          {
            uid: r,
            name: item.name || r,
            status: 'done',
            url: r,
          },
          r,
        );
        this._url = r;
        this.propagateChange(this._url);
      },
      error: (e) => {
        this.loading = false;
        item.onError!(e, item.file);
      },
    });
  };

  /**
   * 自定义移除
   *
   * @param {NzUploadFile} file
   * @memberof UploadComponent
   */
  customRemove = () => {
    this.file = null;
    this._url = '';
    this.propagateChange(this._url);
    return true;
  };

  /**
   * 上传事件
   *
   * @param {{ file: NzUploadFile }} info
   * @memberof EditComponent
   */
  handleChange(info: { file: NzUploadFile }): void {
    switch (info.file.status) {
      case 'uploading':
        this.loading = true;
        break;
      case 'done':
        this.loading = false;
        this.message.success('上传成功');
        break;
      case 'error':
        this.message.error('上传失败');
        this.loading = false;
        break;
    }
  }

  preview(): void {
    this.nzImageService.preview([{ src: this._url, width: '400px', height: '400px', alt: 'oss' }], {
      nzZoom: 1.5,
      nzRotate: 0,
    });
  }

  remove(): void {
    this.file = null;
    this._url = '';
    this.propagateChange(this._url);
  }
}
