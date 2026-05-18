import { Component, forwardRef, inject, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { getBase64 } from '@shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzUploadFile, NzUploadModule, NzUploadXHRArgs } from 'ng-zorro-antd/upload';

import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-upload-list',
  templateUrl: './upload-list.component.html',
  styleUrls: ['./upload-list.component.less'],
  imports: [
    NzUploadModule,
    NzIconModule,
    NzModalModule,
    NzSpinModule,
    NzImageModule,
    NzButtonModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UploadListComponent),
      multi: true,
    },
  ],
})
export class UploadListComponent implements ControlValueAccessor {
  private readonly message = inject(NzMessageService);
  private readonly fileService = inject(FileService);

  /**
   * 最大上传的数量
   *
   * @type {number}
   * @memberof UploadComponent
   */
  @Input() max = 10;

  /**
   * 文件数据
   *
   * @type {any[]}
   * @memberof UploadComponent
   */
  _urlList!: string;

  /**
   * 文件数据
   *
   * @type {any[]}
   * @memberof UploadComponent
   */
  fileList: any[] = [];

  /**
   * 加载状态
   *
   * @memberof UploadComponent
   */
  loading = false;

  get urlList() {
    return this._urlList;
  }

  set urlList(val: string) {
    if (this._urlList !== val) {
      this._urlList = val;
      this.propagateChange(val);
    }
  }

  propagateChange = (_: any) => {};

  writeValue(val: any): void {
    if (val && null != val) {
      this.fileList = val.split(',').map((r: any) => {
        return {
          uid: r,
          name: r,
          status: 'done',
          url: r,
          response: r,
        };
      });
    } else {
      this.fileList = [];
    }
  }

  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }

  registerOnTouched(): void {}

  setDisabledState?(): void {}

  /**
   * 预览
   *
   * @type {(string | undefined)}
   * @memberof UploadComponent
   */
  previewImage = '';
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
    return this.fileService.upload(item.file).subscribe({
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
        this._urlList = this.fileList.map((r) => r.response || r.url).join(',');
        this.propagateChange(this._urlList);
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
  customRemove = (file: NzUploadFile) => {
    const fileUrl = file.response || file.url;
    this.fileList = this.fileList.filter((item: any) => (item.response || item.url) !== fileUrl);
    this._urlList = this.fileList.map((r) => r.response || r.url).join(',');
    this.propagateChange(this._urlList);
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

  openPreview(file: NzUploadFile): void {
    void this.handlePreview(file);
  }

  removeFile(file: NzUploadFile, event?: Event): void {
    event?.stopPropagation();
    this.customRemove(file);
  }
}
