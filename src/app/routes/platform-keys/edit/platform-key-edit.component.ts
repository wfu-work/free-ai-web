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
import { finalize } from 'rxjs';

import {
  CreatePlatformKeyResult,
  PlatformKey,
  PlatformKeyPayload,
} from '../platform-key.model';
import { PlatformKeysService } from '../platform-keys.service';

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

  @Output() readonly saved = new EventEmitter<CreatePlatformKeyResult | null>();
  @Output() readonly closed = new EventEmitter<void>();

  protected visible = false;
  protected saving = false;
  protected formMode: PlatformKeyFormMode = 'create';
  protected editing: PlatformKey | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    allowedModels: [''],
    rateLimitPerMinute: [0],
    remark: [''],
  });

  @Input()
  set nzVisible(value: boolean) {
    this.visible = value;
    if (!value) this.saving = false;
  }

  @Input()
  set platformKey(value: PlatformKey | null) {
    this.editing = value;
    this.formMode = value ? 'edit' : 'create';
    this.form.reset({
      name: value?.name ?? '',
      allowedModels: value?.allowedModels ?? '',
      rateLimitPerMinute: value?.rateLimitPerMinute ?? 0,
      remark: value?.remark ?? '',
    });
  }

  protected close(): void {
    this.visible = false;
    this.saving = false;
    this.closed.emit();
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload: PlatformKeyPayload = {
      ...value,
      rateLimitPerMinute: Math.max(Number(value.rateLimitPerMinute || 0), 0),
    };

    this.saving = true;
    if (this.formMode === 'create') {
      this.platformKeysService
        .create(payload)
        .pipe(
          finalize(() => {
            this.saving = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe((result) => {
          this.visible = false;
          this.message.success('密钥已创建');
          this.saved.emit(result);
        });
      return;
    }

    this.platformKeysService
      .update(this.editing!.guid, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(() => {
        this.visible = false;
        this.message.success('密钥已更新');
        this.saved.emit(null);
      });
  }
}
