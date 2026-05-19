import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, Observable, throwError } from 'rxjs';

import { CreatePlatformKeyResult, PlatformKey, PlatformKeyPayload } from '../platform-key.model';
import { PlatformKeysService } from '../platform-keys.service';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';

type PlatformKeyFormMode = 'create' | 'edit';

@Component({
  selector: 'app-platform-key-edit',
  templateUrl: './platform-key-edit.component.html',
  styleUrls: ['./platform-key-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS],
})
export class PlatformKeyEditComponent {
  private readonly platformKeysService = inject(PlatformKeysService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  @Input() guid: string = inject(NZ_MODAL_DATA);

  protected loading = false;
  protected platformKey: PlatformKey | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    allowedModels: [''],
    rateLimitPerMinute: [0],
    remark: [''],
  });

  ngOnInit(): void {
    this.getData();
  }

  getData(): void {
    if (this.guid && this.guid !== 'new') {
      this.loading = true;
      this.platformKeysService.get(this.guid).subscribe({
        next: (r) => {
          this.platformKey = r;
          this.loading = false;
          this.form.patchValue(r);
        },
        error: (e) => {
          this.loading = false;
          this.message.error(e || '接口错误');
        },
      });
    }
  }

  public submit(): Observable<any> {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) {
      return throwError(() => new Error('数据验证失败'));
    }

    const value = this.form.getRawValue();
    const payload: PlatformKeyPayload = {
      ...this.platformKey,
      ...value,
      rateLimitPerMinute: Math.max(Number(value.rateLimitPerMinute || 0), 0),
    };
    this.loading = true;
    if (!this.guid || this.guid === 'new') {
      return this.platformKeysService.create(payload);
    } else {
      return this.platformKeysService.update(this.guid, payload);
    }
  }
}
