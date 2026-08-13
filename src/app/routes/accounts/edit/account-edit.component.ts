import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MetricCardComponent, SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { Subscription, catchError, finalize, of, switchMap, timer } from 'rxjs';

import {
  DEFAULT_ACCOUNT_GROUP_OPTIONS,
  DEFAULT_OFFICIAL_VENDOR_CODE,
  OFFICIAL_VENDOR_OPTIONS,
  mergeStringOptions,
  normalizeOfficialVendorCode,
} from '../account-options';
import {
  Account,
  AccountAPIKeyPayload,
  AccountImportPayload,
  AccountManualPayload,
  AccountOAuthMode,
  AccountOAuthSession,
  AccountPayload,
  AccountPoolPayload,
} from '../account.model';
import { AccountsService } from '../accounts.service';

type AccountFormMode = 'create' | 'edit';
type AccountCreateMode = 'oauth' | 'api-key' | 'manual' | 'file';

interface AccountCreateGuideOption {
  title: string;
  badge: string;
  description: string;
}

interface AccountCreateGuide {
  eyebrow: string;
  title: string;
  description: string;
  optionTitle: string;
  optionDescription: string;
  options: AccountCreateGuideOption[];
  steps: string[];
  notice: string;
}

@Component({
  selector: 'app-account-edit',
  templateUrl: './account-edit.component.html',
  styleUrls: ['./account-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, MetricCardComponent, NzSegmentedModule],
})
export class AccountEditComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = false;
  protected saving = false;
  protected fetchingModels = false;
  protected refreshingUsage = false;
  protected probing = false;
  protected formMode: AccountFormMode = 'create';
  protected accountGuid = '';
  protected account: Account | null = null;
  protected accountGroupOptions = [...DEFAULT_ACCOUNT_GROUP_OPTIONS];
  protected accountFileName = '';
  protected accountFile: Record<string, unknown> | null = null;
  protected accountFileSummary = '';
  protected createMode: AccountCreateMode = 'oauth';
  protected authorizing = false;
  protected completingCallback = false;
  protected oauthSession: AccountOAuthSession | null = null;
  protected callbackUrl = '';
  protected readonly officialVendorOptions = OFFICIAL_VENDOR_OPTIONS;
  protected readonly createModeOptions: Array<{ label: string; value: AccountCreateMode }> = [
    { label: '官方授权', value: 'oauth' },
    { label: '图片 API', value: 'api-key' },
    { label: '手动凭据', value: 'manual' },
    { label: '导入文件', value: 'file' },
  ];
  protected readonly createGuides: Record<AccountCreateMode, AccountCreateGuide> = {
    oauth: {
      eyebrow: '推荐添加方式',
      title: 'OpenAI 官方授权',
      description:
        '由 OpenAI 完成身份验证，FreeAi 只接收授权结果。适合首次添加账号，也能避免手工复制敏感凭据。',
      optionTitle: '选择授权通道',
      optionDescription: '两种方式最终都会生成同一类官方 OAuth 账号。',
      options: [
        {
          title: '浏览器 PKCE',
          badge: '首选',
          description: '自动打开官方登录页，并通过一次性 State 与 PKCE 校验授权回调。',
        },
        {
          title: '设备码授权',
          badge: '备用',
          description: '适合本机回调端口被占用、浏览器与服务不在同一设备的情况。',
        },
        {
          title: '密码完全隔离',
          badge: '安全',
          description: '账号密码只在 OpenAI 页面输入，本系统不会读取或保存邮箱密码。',
        },
      ],
      steps: [
        '校验授权回调、一次性 State 和 PKCE 会话，避免授权结果串用。',
        '解析官方账号、邮箱、工作区与令牌到期时间。',
        '使用后端主密钥加密凭据；相同官方账号会原地更新。',
        '账号入池后自动同步 7 天额度、订阅到期时间和官方模型目录。',
      ],
      notice: '通常优先选择浏览器授权；只有回调端口不可用时，再改用设备码。',
    },
    'api-key': {
      eyebrow: '独立图片能力',
      title: 'OpenAI 图片 API',
      description:
        '使用 OpenAI Platform API Key 建立独立图片模型账号池，支持 Images API，与 ChatGPT/Codex OAuth 账号完全隔离。',
      optionTitle: '接入边界',
      optionDescription: '图片 API 使用 OpenAI Platform 的项目权限和按量计费。',
      options: [
        {
          title: '独立 API Key',
          badge: '必需',
          description: '仅接受 OpenAI Platform API Key，不读取或转换 ChatGPT OAuth 凭据。',
        },
        {
          title: '图片模型目录',
          badge: '自动同步',
          description: '保存前验证密钥，并同步该项目实际可见的图片生成模型。',
        },
        {
          title: 'Images API',
          badge: '专用端点',
          description: '账号只参与 /v1/images/generations 路由，不会用于文本模型请求。',
        },
      ],
      steps: [
        '调用 OpenAI 官方模型接口验证 API Key，不发起图片生成，因此不会产生生成费用。',
        '筛选项目可见的图片模型，并建立独立模型目录与账号可用关系。',
        '使用后端主密钥加密 API Key，仅保留脱敏提示用于管理识别。',
        '图片请求按账号组、优先级和权重进入独立账号池调度。',
      ],
      notice:
        'ChatGPT Pro 订阅不包含 OpenAI Platform API 额度；图片调用按项目单独计费，请在 Platform 中配置预算和消费上限。',
    },
    manual: {
      eyebrow: '适合已有凭据',
      title: '手动 OAuth 凭据',
      description:
        '至少填写 Access Token 或 Refresh Token。系统会验证凭据、补全官方身份，并将账号加入统一调度池。',
      optionTitle: '凭据填写优先级',
      optionDescription: '凭据越完整，身份识别和后续自动续期越稳定。',
      options: [
        {
          title: 'Refresh Token',
          badge: '推荐',
          description: '建议优先填写，用于获取或续期 Access Token，适合长期运行。',
        },
        {
          title: 'Access Token',
          badge: '至少一项',
          description: '可直接校验账号；若已过期或即将过期，还需要 Refresh Token。',
        },
        {
          title: 'ID Token / 账号 ID',
          badge: '身份补充',
          description: '用于补全邮箱与账号身份；有效 JWT 能解析时可以留空。',
        },
      ],
      steps: [
        '检查 OAuth Token 完整性，并拒绝 OpenAI Platform API Key。',
        'Access Token 缺失或临近过期时，优先使用 Refresh Token 自动续期。',
        '解析官方账号身份并加密保存，相同账号不会重复创建。',
        '保存成功后后台同步 7 天额度、订阅信息和官方模型目录。',
      ],
      notice: '不要把 OAuth Token 粘贴到聊天、日志或工单；保存后前端不会再次展示明文。',
    },
    file: {
      eyebrow: '批量迁移友好',
      title: '导入 OAuth 账号文件',
      description:
        '适合从 FreeAi、Codex-Manager 或兼容工具迁移账号。选择文件后会先在本地完成结构检查。',
      optionTitle: '导入前检查',
      optionDescription: '文件需要是规范 JSON，并包含能够唯一识别账号的官方凭据。',
      options: [
        {
          title: '必须字段',
          badge: '必需',
          description: '需要包含 Access Token，以及官方账号 ID 或可解析账号 ID 的信息。',
        },
        {
          title: '推荐字段',
          badge: '建议',
          description: '包含 Refresh Token、ID Token 和订阅元数据，可减少首次同步等待。',
        },
        {
          title: '兼容来源',
          badge: 'JSON',
          description: '支持 FreeAi 规范文件以及可被当前账号解析器识别的兼容格式。',
        },
      ],
      steps: [
        '浏览器只读取文件并检查必要字段，同时显示脱敏账号摘要。',
        '后端规范化 OAuth 数据，解析账号、工作区与令牌有效期。',
        '凭据加密后写入账号池；相同官方账号会更新原记录。',
        '导入完成后自动同步 7 天额度、订阅信息和官方模型目录。',
      ],
      notice: '原始文件不会保存在浏览器中；导入完成后仍请妥善保管或安全删除本地副本。',
    },
  };
  private oauthPolling?: Subscription;

  protected readonly form = this.fb.nonNullable.group({
    name: [''],
    vendorCode: [DEFAULT_OFFICIAL_VENDOR_CODE],
    accountGroup: [''],
    priority: [0],
    weight: [1, [Validators.min(1)]],
    remark: [''],
  });

  protected readonly manualForm = this.fb.nonNullable.group({
    refreshToken: [''],
    accessToken: [''],
    idToken: [''],
    accountId: [''],
  });

  protected readonly apiKeyForm = this.fb.nonNullable.group({
    apiKey: ['', [Validators.required, Validators.minLength(20)]],
  });

  ngOnInit(): void {
    this.loadGroups();
    const guid = this.route.snapshot.paramMap.get('guid');
    if (guid) {
      this.enterEditMode(guid);
    } else {
      this.formMode = 'create';
      this.form.controls.accountGroup.setValue(
        (this.route.snapshot.queryParamMap.get('group') || '').trim(),
      );
    }
  }

  ngOnDestroy(): void {
    this.oauthPolling?.unsubscribe();
  }

  protected changeCreateMode(value: string | number): void {
    const nextMode = String(value) as AccountCreateMode;
    if (nextMode === this.createMode) return;
    const activeSession = this.oauthSession;
    if (this.createMode === 'api-key') {
      this.apiKeyForm.reset();
    }
    this.createMode = nextMode;
    this.stopOAuthPolling();
    this.oauthSession = null;
    this.callbackUrl = '';
    if (activeSession && !this.isOAuthTerminal(activeSession.status)) {
      this.accountsService.cancelOAuth(activeSession.id).subscribe({ error: () => undefined });
    }
    this.cdr.markForCheck();
  }

  protected onAccountFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '')) as Record<string, unknown>;
        const tokens = parsed['tokens'] as Record<string, unknown> | undefined;
        const meta = parsed['meta'] as Record<string, unknown> | undefined;
        if (!tokens || typeof tokens['access_token'] !== 'string') {
          throw new Error('缺少 tokens.access_token');
        }
        if (
          typeof tokens['account_id'] !== 'string' &&
          typeof meta?.['chatgptAccountId'] !== 'string'
        ) {
          throw new Error('缺少 ChatGPT 账号 ID');
        }
        this.accountFile = parsed;
        this.accountFileName = file.name;
        const label = String(meta?.['label'] || '');
        const accountID = String(tokens['account_id'] || meta?.['chatgptAccountId'] || '');
        this.accountFileSummary = `${label || 'OAuth 账号'} · ${this.maskAccountID(accountID)}`;
        if (!this.form.controls.name.value && label) this.form.controls.name.setValue(label);
        this.message.success('OAuth 账号文件解析成功');
      } catch (error) {
        this.accountFile = null;
        this.accountFileName = '';
        this.accountFileSummary = '';
        this.message.error(error instanceof Error ? error.message : '账号文件格式错误');
      }
      this.cdr.markForCheck();
    };
    reader.onerror = () => this.message.error('读取账号文件失败');
    reader.readAsText(file);
  }

  protected save(): void {
    if (!this.validatePoolForm()) return;
    if (this.formMode === 'create' && this.createMode === 'oauth') {
      this.message.warning('请先完成官方授权登录');
      return;
    }
    if (this.formMode === 'create' && this.createMode === 'file' && !this.accountFile) {
      this.message.warning('请先选择 Codex OAuth 账号 JSON 文件');
      return;
    }
    if (this.formMode === 'create' && this.createMode === 'manual') {
      const credentials = this.manualForm.getRawValue();
      if (!credentials.accessToken.trim() && !credentials.refreshToken.trim()) {
        this.message.warning('Access Token 和 Refresh Token 至少填写一项');
        return;
      }
    }
    if (this.formMode === 'create' && this.createMode === 'api-key') {
      const control = this.apiKeyForm.controls.apiKey;
      control.markAsDirty();
      control.updateValueAndValidity();
      if (control.invalid) {
        this.message.warning('请输入有效的 OpenAI Platform API Key');
        return;
      }
    }
    const value = this.form.getRawValue();
    this.saving = true;
    const pool = this.poolPayload();
    const request =
      this.formMode === 'create' && this.createMode === 'file'
        ? this.accountsService.importAccount({
            accountFile: this.accountFile!,
            ...pool,
          } satisfies AccountImportPayload)
        : this.formMode === 'create' && this.createMode === 'api-key'
          ? this.accountsService.addAPIKey({
              ...pool,
              apiKey: this.apiKeyForm.controls.apiKey.value.trim(),
            } satisfies AccountAPIKeyPayload)
          : this.formMode === 'create'
            ? this.accountsService.addManual({
                ...pool,
                ...this.manualForm.getRawValue(),
              } satisfies AccountManualPayload)
            : this.accountsService.update(this.accountGuid, {
                name: value.name.trim(),
                vendorCode: value.vendorCode,
                accountGroup: value.accountGroup,
                priority: Number(value.priority || 0),
                weight: Math.max(Number(value.weight || 1), 1),
                remark: value.remark,
              } satisfies AccountPayload);

    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(() => {
        const message =
          this.formMode === 'edit'
            ? '账号调度配置已更新'
            : this.createMode === 'file'
              ? 'OAuth 账号已导入'
              : this.createMode === 'api-key'
                ? '图片 API 账号已添加'
                : 'OAuth 凭据已保存';
        this.message.success(message);
        void this.router.navigateByUrl('/accounts/list');
      });
  }

  protected startOAuth(mode: AccountOAuthMode): void {
    if (!this.validatePoolForm() || this.authorizing) return;
    const activeSession = this.oauthSession;
    if (activeSession && !this.isOAuthTerminal(activeSession.status)) {
      this.accountsService.cancelOAuth(activeSession.id).subscribe({
        next: () => this.beginOAuth(mode),
        error: () => this.beginOAuth(mode),
      });
      return;
    }
    this.beginOAuth(mode);
  }

  protected completeOAuth(): void {
    const session = this.oauthSession;
    const callbackUrl = this.callbackUrl.trim();
    if (!session || session.mode !== 'browser' || !callbackUrl || this.completingCallback) {
      this.message.warning('请填写浏览器最终跳转的完整回调地址');
      return;
    }
    this.completingCallback = true;
    this.accountsService
      .completeOAuth(session.id, { callbackUrl })
      .pipe(
        finalize(() => {
          this.completingCallback = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => this.applyOAuthSession(result));
  }

  protected cancelOAuth(): void {
    const session = this.oauthSession;
    if (!session || this.isOAuthTerminal(session.status)) return;
    this.accountsService.cancelOAuth(session.id).subscribe((result) => {
      this.applyOAuthSession(result);
      this.message.info('授权会话已取消');
    });
  }

  protected openOAuthUrl(url?: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected async copy(value: string | undefined, label: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success(`${label}已复制`);
    } catch {
      this.message.error(`复制${label}失败`);
    }
  }

  protected oauthStatusText(status?: string): string {
    const map: Record<string, string> = {
      pending: '等待授权',
      completing: '正在写入账号',
      success: '授权成功',
      failed: '授权失败',
      cancelled: '已取消',
      expired: '已过期',
    };
    return map[status || ''] || status || '-';
  }

  protected get createActionText(): string {
    if (this.createMode === 'file') return '导入账号';
    if (this.createMode === 'api-key') return '验证并添加';
    return '保存凭据';
  }

  protected get activeCreateGuide(): AccountCreateGuide {
    return this.createGuides[this.createMode];
  }

  protected get securityAlertMessage(): string {
    if (this.formMode === 'edit') {
      return this.isImageAPIAccount
        ? 'OpenAI API Key 由后端主密钥加密保存，管理端不会返回或再次展示明文。'
        : 'OAuth 令牌由后端主密钥加密保存，账号操作不会在前端展示明文凭据。';
    }
    if (this.createMode === 'oauth') {
      return '授权回调只在本机完成，系统不会保存 OpenAI 密码；获取的 OAuth 令牌由后端加密存储。';
    }
    if (this.createMode === 'api-key') {
      return 'API Key 仅用于 OpenAI 官方图片接口，提交后加密保存；ChatGPT 订阅与 API 计费相互独立。';
    }
    return 'OAuth 凭据属于敏感信息，提交后由后端主密钥加密存储，请勿通过日志或聊天发送。';
  }

  protected get isImageAPIAccount(): boolean {
    return this.account?.productCode === 'openai_images';
  }

  protected fetchModels(): void {
    if (!this.accountGuid) return;
    this.fetchingModels = true;
    this.accountsService
      .fetchModels({ guid: this.accountGuid })
      .pipe(
        finalize(() => {
          this.fetchingModels = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.message.success(`已同步 ${result.models?.length || 0} 个官方模型到模型目录`);
      });
  }

  protected refreshUsage(): void {
    if (!this.accountGuid) return;
    this.refreshingUsage = true;
    this.accountsService
      .refreshUsage(this.accountGuid)
      .pipe(
        finalize(() => {
          this.refreshingUsage = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.message.success(
          this.isImageAPIAccount
            ? 'API Key 验证通过，图片模型已同步'
            : `已同步 ${result.quotas?.length || 0} 个额度窗口`,
        );
        this.reloadAccount();
      });
  }

  protected probe(): void {
    if (!this.accountGuid) return;
    this.probing = true;
    this.accountsService
      .probe(this.accountGuid, {})
      .pipe(
        finalize(() => {
          this.probing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.message.success(
            this.isImageAPIAccount
              ? 'API Key 验证通过，未发起图片生成'
              : '主动探测成功，已采样额度响应头',
          );
        } else {
          this.message.warning('主动探测返回异常');
        }
        this.reloadAccount();
      });
  }

  protected exportAccount(): void {
    if (!this.accountGuid || this.isImageAPIAccount) return;
    this.modal.confirm({
      nzTitle: '导出 OAuth 账号文件？',
      nzContent:
        '导出文件包含 access_token 和 refresh_token。请只保存到可信位置，不要通过聊天或工单发送。',
      nzOkText: '确认导出',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.accountsService.exportAccount(this.accountGuid).subscribe({
            next: (blob) => {
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement('a');
              anchor.href = url;
              anchor.download = `${this.account?.chatgptAccountId || this.accountGuid}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
              this.message.success('账号文件已导出');
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected goList(): void {
    void this.router.navigateByUrl('/accounts/list');
  }

  protected get pageTitle(): string {
    return this.formMode === 'create' ? '添加官方账号' : '账号设置';
  }

  protected get pageDescription(): string {
    return this.formMode === 'create'
      ? '添加 Codex OAuth 账号，或使用独立 OpenAI Platform API Key 接入图片模型。'
      : this.isImageAPIAccount
        ? '查看图片 API 账号状态，调整账号池调度参数并同步可用模型。'
        : '查看账号身份与订阅状态，调整账号池调度参数并同步官方模型。';
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false });
  }

  protected statusText(status?: string): string {
    const map: Record<string, string> = {
      available: '可用',
      limited: '限流',
      cooldown: '冷却',
      exhausted: '耗尽',
      disabled: '禁用',
      expired: '过期',
      invalid: '失效',
      unknown: '未知',
    };
    return map[status || ''] || status || '-';
  }

  protected tokenStatusText(status?: string): string {
    const map: Record<string, string> = {
      active: '有效',
      refresh_needed: '需要刷新',
      refresh_failed: '刷新失败',
      invalid: '无效',
    };
    return map[status || ''] || status || '-';
  }

  private enterEditMode(guid: string): void {
    this.formMode = 'edit';
    this.accountGuid = guid;
    this.reloadAccount();
  }

  private reloadAccount(): void {
    this.loading = true;
    this.accountsService
      .get(this.accountGuid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((account) => {
        this.account = account;
        this.accountGroupOptions = mergeStringOptions(this.accountGroupOptions, [
          account.accountGroup,
        ]);
        this.form.reset({
          name: account.name || '',
          vendorCode: normalizeOfficialVendorCode(account.vendorCode),
          accountGroup: account.accountGroup || '',
          priority: account.priority || 0,
          weight: account.weight || 1,
          remark: account.remark || '',
        });
      });
  }

  private loadGroups(): void {
    this.accountsService
      .listGroups()
      .pipe(catchError(() => of([])))
      .subscribe((groups) => {
        this.accountGroupOptions = mergeStringOptions(
          DEFAULT_ACCOUNT_GROUP_OPTIONS,
          groups.map((item) => item.name),
        );
        this.cdr.markForCheck();
      });
  }

  private validatePoolForm(): boolean {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    return this.form.valid;
  }

  private poolPayload(): AccountPoolPayload {
    const value = this.form.getRawValue();
    return {
      vendorCode: value.vendorCode,
      name: value.name.trim(),
      accountGroup: value.accountGroup,
      priority: Number(value.priority || 0),
      weight: Math.max(Number(value.weight || 1), 1),
      remark: value.remark,
    };
  }

  private beginOAuth(mode: AccountOAuthMode): void {
    this.stopOAuthPolling();
    this.oauthSession = null;
    this.callbackUrl = '';
    this.authorizing = true;
    this.accountsService
      .startOAuth({ mode, ...this.poolPayload() })
      .pipe(
        finalize(() => {
          this.authorizing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((session) => {
        this.oauthSession = session;
        this.startOAuthPolling(session.id);
        this.openOAuthUrl(session.authorizationUrl || session.verificationUrl);
        this.cdr.markForCheck();
      });
  }

  private startOAuthPolling(id: string): void {
    this.stopOAuthPolling();
    this.oauthPolling = timer(1200, 1500)
      .pipe(switchMap(() => this.accountsService.oauthStatus(id)))
      .subscribe({
        next: (session) => this.applyOAuthSession(session),
        error: () => {
          this.stopOAuthPolling();
          this.cdr.markForCheck();
        },
      });
  }

  private applyOAuthSession(session: AccountOAuthSession): void {
    this.oauthSession = session;
    if (this.isOAuthTerminal(session.status)) {
      this.stopOAuthPolling();
    }
    if (session.status === 'success' && session.accountGuid) {
      this.message.success('官方账号授权成功，正在同步额度与模型');
      void this.router.navigate(['/accounts/edit', session.accountGuid]);
    }
    this.cdr.markForCheck();
  }

  private stopOAuthPolling(): void {
    this.oauthPolling?.unsubscribe();
    this.oauthPolling = undefined;
  }

  private isOAuthTerminal(status: string): boolean {
    return ['success', 'failed', 'cancelled', 'expired'].includes(status);
  }

  private maskAccountID(value: string): string {
    return value.length > 12 ? `${value.slice(0, 5)}…${value.slice(-6)}` : value || '-';
  }
}
