import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  AccountSelectOption,
  DEFAULT_ACCOUNT_GROUP_OPTIONS,
  DEFAULT_USAGE_QUERY_OPTIONS,
  getAccountTypeLabel,
  getProviderLabel,
  mergeAccountTypeOptions,
  mergeProviderOptions,
  mergeStringOptions,
} from '../account-options';
import { Account, AccountPayload } from '../account.model';
import { AccountsService } from '../accounts.service';

type AccountFormMode = 'create' | 'edit';

const PROVIDER_API_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  codexzh: 'https://api.codexzh.com/v1',
  freemodel: 'https://api.freemodel.dev',
  aiok: 'https://aiok.club/v1',
  tokeni: 'https://api.tokeni.top',
};
const USAGE_API_URLS: Record<string, string> = {
  codexzh: 'https://codexzh.com/api/v1/usage/stats',
  freemodel: 'https://freemodel.dev/api/usage',
  tokeni: 'https://api.tokeni.top/v1/usage',
};
const OPENAI_OAUTH_AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize';
const OPENAI_OAUTH_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENAI_OAUTH_REDIRECT_URI = 'http://localhost:1455/auth/callback';
const OPENAI_OAUTH_SCOPE = 'openid profile email offline_access api.connectors.read api.connectors.invoke';
const OPENAI_OAUTH_VERIFIER_STORAGE_KEY = 'freeai.openai.oauth.codeVerifier';

@Component({
  selector: 'app-account-edit',
  templateUrl: './account-edit.component.html',
  styleUrls: ['./account-edit.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountEditComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = false;
  protected saving = false;
  protected formMode: AccountFormMode = 'create';
  protected accountGuid = '';
  protected account: Account | null = null;
  protected providerOptions: AccountSelectOption[] = mergeProviderOptions([]);
  protected accountGroupOptions = [...DEFAULT_ACCOUNT_GROUP_OPTIONS];
  protected accountTypeOptions: AccountSelectOption[] = mergeAccountTypeOptions([]);
  protected modelOptions: string[] = [];
  protected fetchingModels = false;
  protected parsingCallback = false;
  protected loginCallbackHint = '';
  protected openAIAuthorizeUrl = '';
  protected readonly usageQueryOptions = DEFAULT_USAGE_QUERY_OPTIONS;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    email: [''],
    provider: ['openai', [Validators.required]],
    apiBaseUrl: [''],
    supplierName: [''],
    officialUrl: [''],
    usageQueryType: [''],
    usageApiUrl: [''],
    accountType: [''],
    authType: ['api_key', [Validators.required]],
    secret: [''],
    callbackUrl: [''],
    supportedModels: [''],
    accountGroup: [''],
    priority: [0],
    weight: [1],
    subscriptionExpiredAt: [0],
    remark: [''],
  });

  private readonly handleOAuthCallbackMessage = (event: MessageEvent): void => {
    if (!this.isOpenAICallbackOrigin(event.origin)) {
      return;
    }
    const data = event.data as Partial<{ type: string; callbackUrl: string }> | null;
    if (data?.type !== 'freeai.openai.oauth.callback' || !data.callbackUrl) {
      return;
    }
    this.form.controls.authType.setValue('login_callback');
    this.form.controls.callbackUrl.setValue(data.callbackUrl);
    this.loginCallbackHint = '已收到 OpenAI 本地回调，正在解析认证信息。';
    this.parseLoginCallback();
    this.cdr.markForCheck();
  };

  ngOnInit(): void {
    window.addEventListener('message', this.handleOAuthCallbackMessage);
    this.form.controls.provider.valueChanges.subscribe((provider) => {
      this.syncApiBaseUrlWithProvider(provider);
      this.syncUsageConfigWithProvider(provider);
      this.syncCustomProviderValidators();
      this.cdr.markForCheck();
    });
    this.form.controls.usageQueryType.valueChanges.subscribe(() => {
      this.syncUsageApiUrlValidators();
      this.cdr.markForCheck();
    });
    this.form.controls.authType.valueChanges.subscribe(() => {
      this.syncSecretValidators();
      this.cdr.markForCheck();
    });
    this.syncCustomProviderValidators();
    this.syncUsageApiUrlValidators();
    this.loadSelectOptions();
    const guid = this.route.snapshot.paramMap.get('guid');
    if (guid) {
      this.enterEditMode(guid);
      return;
    }
    this.enterCreateMode();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.handleOAuthCallbackMessage);
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload: AccountPayload = {
      ...value,
      apiBaseUrl: this.resolveApiBaseUrl(value.provider, value.apiBaseUrl),
      supplierName: value.provider === 'custom' ? value.supplierName.trim() : '',
      officialUrl: value.provider === 'custom' ? value.officialUrl.trim() : '',
      usageQueryType: value.usageQueryType,
      usageApiUrl: this.resolveUsageApiUrl(value.usageQueryType, value.usageApiUrl),
      supportedModels: value.supportedModels ? JSON.stringify([value.supportedModels]) : '',
      priority: Number(value.priority || 0),
      weight: Math.max(Number(value.weight || 1), 1),
      subscriptionExpiredAt: Number(value.subscriptionExpiredAt || 0),
    };

    if (this.formMode === 'edit' && !payload.secret) {
      delete payload.secret;
    }

    this.saving = true;
    const request =
      this.formMode === 'create'
        ? this.accountsService.create(payload)
        : this.accountsService.update(this.accountGuid, payload);

    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((account) => {
        this.account = account ?? this.account;
        this.message.success(this.formMode === 'create' ? '账号已创建' : '账号已更新');
        this.router.navigateByUrl('/accounts/list');
      });
  }

  protected goList(): void {
    this.router.navigateByUrl('/accounts/list');
  }

  protected get pageTitle(): string {
    return this.formMode === 'create' ? '新增账号' : '编辑账号';
  }

  protected get pageDescription(): string {
    return this.formMode === 'create'
      ? '创建新的上游 AI 账号，配置供应商、认证方式、支持模型与调度优先级。'
      : '更新已有账号的供应商、调度参数与 Secret；留空 Secret 表示继续使用当前值。';
  }

  protected get statusLabel(): string {
    if (this.formMode === 'create') return '待创建';
    return this.statusText(this.account?.status);
  }

  protected get enabledLabel(): string {
    if (this.formMode === 'create') return '创建后设置';
    return this.account?.enabled ? '已启用' : '已停用';
  }

  protected get secretHint(): string {
    if (this.formMode === 'create') return '创建后生成';
    return this.account?.secretHint || '未提供';
  }

  protected get authTypeLabel(): string {
    const authType = this.form.controls.authType.value;
    if (authType === 'login_callback') return '登录回调';
    return authType === 'api_key' ? 'API Key' : 'Bearer Token';
  }

  protected get modelsLabel(): string {
    return this.form.controls.supportedModels.value || '未限制';
  }

  protected get scheduleLabel(): string {
    const priority = Number(this.form.controls.priority.value || 0);
    const weight = Math.max(Number(this.form.controls.weight.value || 1), 1);
    return `P${priority} / W${weight}`;
  }

  protected get secretPolicyLabel(): string {
    return this.formMode === 'create' ? '首次创建需填写' : '留空保留当前值';
  }

  protected get accountTypeLabel(): string {
    return getAccountTypeLabel(this.form.controls.accountType.value);
  }

  protected get providerLabel(): string {
    return getProviderLabel(this.form.controls.provider.value);
  }

  protected get isCustomProvider(): boolean {
    return this.form.controls.provider.value === 'custom';
  }

  protected get apiBaseUrlReadonly(): boolean {
    return !this.isCustomProvider;
  }

  protected get showUsageConfig(): boolean {
    const provider = this.form.controls.provider.value;
    return provider === 'custom' || provider === 'codexzh' || provider === 'freemodel' || provider === 'tokeni';
  }

  protected get isCodexZHUsageQuery(): boolean {
    return this.form.controls.usageQueryType.value === 'codexzh';
  }

  protected get needsUsageApiUrl(): boolean {
    return ['codexzh', 'freemodel', 'tokeni'].includes(this.form.controls.usageQueryType.value);
  }

  protected get usageApiUrlPlaceholder(): string {
    return this.defaultUsageApiUrl(this.form.controls.usageQueryType.value) || 'https://example.com/api/usage';
  }

  protected get usageQueryExtra(): string {
    const provider = this.form.controls.provider.value;
    if (provider === 'tokeni') return 'Tokeni 中转账号会默认使用 Tokeni 额度接口同步额度。';
    if (provider === 'freemodel') return 'FreeModel 中转账号会默认使用 FreeModel 额度接口同步额度。';
    if (provider === 'codexzh') return 'CodexZH 中转账号会默认使用 CodexZH 额度接口同步额度。';
    return '自定义中转账号需要选择对应的额度查询方式，才可以同步额度。';
  }

  protected get isLoginCallbackAuth(): boolean {
    return this.form.controls.authType.value === 'login_callback';
  }

  protected get canOpenLoginAuth(): boolean {
    return this.form.controls.provider.value === 'openai';
  }

  protected get apiBaseUrlHint(): string {
    const provider = this.form.controls.provider.value;
    if (provider === 'custom') return '自定义供应商需要填写 OpenAI 兼容接口地址，通常以 /v1 结尾。';
    return '系统会按供应商自动使用该接口地址，账号测试和网关转发都会走这里。';
  }

  protected async openLoginAuth(): Promise<void> {
    if (!this.canOpenLoginAuth) {
      this.message.warning('当前只支持 OpenAI 登录授权入口');
      return;
    }
    try {
      const state = this.randomBase64Url(32);
      const codeVerifier = this.randomBase64Url(64);
      const codeChallenge = await this.sha256Base64Url(codeVerifier);
      sessionStorage.setItem(this.oauthVerifierStorageKey(state), codeVerifier);
      this.openAIAuthorizeUrl = this.buildOpenAIAuthorizeUrl(state, codeChallenge);
      this.loginCallbackHint = `已打开 OpenAI OAuth 授权页；回调地址为 ${OPENAI_OAUTH_REDIRECT_URI}，登录后请复制浏览器地址栏中的完整回调 URL 到下方解析。`;
      const authWindow = window.open(this.openAIAuthorizeUrl, '_blank', 'noopener,noreferrer');
      if (!authWindow) {
        this.message.warning('浏览器拦截了登录授权窗口，请允许弹出窗口后重试');
        return;
      }
      this.cdr.markForCheck();
    } catch {
      this.message.error('生成 OpenAI OAuth 授权地址失败');
    }
  }

  protected copyOpenAIAuthorizeUrl(): void {
    if (!this.openAIAuthorizeUrl) {
      this.message.warning('请先点击登录授权生成授权链接');
      return;
    }
    navigator.clipboard
      .writeText(this.openAIAuthorizeUrl)
      .then(() => this.message.success('授权链接已复制'))
      .catch(() => this.message.error('复制失败，请手动选择链接复制'));
  }

  protected parseLoginCallback(): void {
    const callbackUrl = this.form.controls.callbackUrl.value.trim();
    if (!callbackUrl) {
      this.message.warning('请先粘贴浏览器跳转后的完整回调 URL');
      return;
    }
    this.parsingCallback = true;
    this.accountsService
      .parseLoginCallback({
        provider: this.form.controls.provider.value,
        callbackUrl,
        codeVerifier: this.getCodeVerifierFromCallback(callbackUrl),
        redirectUri: OPENAI_OAUTH_REDIRECT_URI,
      })
      .pipe(
        finalize(() => {
          this.parsingCallback = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.form.controls.authType.setValue(result.authType || 'login_callback');
        this.form.controls.secret.setValue(result.secret || '');
        this.loginCallbackHint = result.hasAccessToken
          ? `已解析 access_token，Secret 提示：${result.secretHint || '-'}`
          : result.exchangeError
            ? `已解析 code/state，但换取 access_token 失败：${result.exchangeError}`
            : '已解析 code/state，但没有 access_token；请确认这是当前页面点击登录授权后生成的回调 URL。';
        if (result.hasAccessToken) {
          this.message.success('登录回调已解析');
        } else {
          this.message.warning('已解析回调，但未发现 access_token');
        }
      });
  }

  protected fetchModels(): void {
    const value = this.form.getRawValue();
    if (!this.resolveApiBaseUrl(value.provider, value.apiBaseUrl)) {
      this.message.warning('请先填写 API 请求地址');
      return;
    }
    if (!value.secret.trim() && this.formMode === 'create') {
      this.message.warning('请先填写 Secret，拉取模型列表需要上游鉴权');
      return;
    }
    this.fetchingModels = true;
    this.accountsService
      .fetchModels({
        guid: this.formMode === 'edit' ? this.accountGuid : '',
        provider: value.provider,
        apiBaseUrl: this.resolveApiBaseUrl(value.provider, value.apiBaseUrl),
        authType: value.authType,
        secret: value.secret,
      })
      .pipe(
        finalize(() => {
          this.fetchingModels = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.modelOptions = this.mergeModelOptions(result.models || []);
        if (!this.form.controls.supportedModels.value && this.modelOptions.length) {
          this.form.controls.supportedModels.setValue(this.modelOptions[0]);
        }
        this.message.success(`已获取 ${this.modelOptions.length} 个模型`);
      });
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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
    const value = (status || '').trim();
    if (!value) return '--';
    return map[value] || value;
  }

  private enterCreateMode(): void {
    const queryGroup = (this.route.snapshot.queryParamMap.get('group') || '').trim();
    this.mergeSelectOptions([], queryGroup ? [queryGroup] : [], []);
    this.formMode = 'create';
    this.accountGuid = '';
    this.account = null;
    this.modelOptions = [];
    this.form.reset({
      name: '',
      email: '',
      provider: 'openai',
      apiBaseUrl: this.providerDefaultApiBaseUrl('openai'),
      supplierName: '',
      officialUrl: '',
      usageQueryType: '',
      usageApiUrl: '',
      accountType: 'manual',
      authType: 'api_key',
      secret: '',
      callbackUrl: '',
      supportedModels: '',
      accountGroup: queryGroup,
      priority: 0,
      weight: 1,
      subscriptionExpiredAt: 0,
      remark: '',
    });
    this.form.controls.secret.setValidators([Validators.required]);
    this.form.controls.secret.updateValueAndValidity();
    this.tryParseLoginCallbackFromLocation();
    this.cdr.markForCheck();
  }

  private enterEditMode(guid: string): void {
    this.formMode = 'edit';
    this.accountGuid = guid;
    this.form.controls.secret.clearValidators();
    this.form.controls.secret.updateValueAndValidity();

    this.loading = true;
    this.accountsService
      .get(guid)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((account) => {
        this.account = account;
        this.mergeSelectOptions([account.provider], [account.accountGroup], [account.accountType]);
        this.modelOptions = this.mergeModelOptions([this.firstSupportedModel(account.supportedModels)]);
        this.form.reset({
          name: account.name ?? '',
          email: account.email ?? '',
          provider: account.provider ?? 'openai',
          apiBaseUrl: account.apiBaseUrl || this.providerDefaultApiBaseUrl(account.provider),
          supplierName: account.supplierName ?? '',
          officialUrl: account.officialUrl ?? '',
          usageQueryType: account.usageQueryType ?? '',
          usageApiUrl: account.usageApiUrl ?? '',
          accountType: account.accountType ?? '',
          authType: account.authType || 'api_key',
          secret: '',
          callbackUrl: '',
          supportedModels: this.firstSupportedModel(account.supportedModels),
          accountGroup: account.accountGroup ?? '',
          priority: account.priority ?? 0,
          weight: account.weight || 1,
          subscriptionExpiredAt: account.subscriptionExpiredAt ?? 0,
          remark: account.remark ?? '',
        });
        this.tryParseLoginCallbackFromLocation();
      });
  }

  private loadSelectOptions(): void {
    forkJoin({
      accounts: this.accountsService.listAll().pipe(catchError(() => of([]))),
      groups: this.accountsService.listGroups().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ accounts, groups }) => {
        this.mergeSelectOptions(
          accounts.map((item) => item.provider),
          groups.map((item) => item.name),
          accounts.map((item) => item.accountType),
        );
        this.cdr.markForCheck();
      },
      error: () => undefined,
    });
  }

  private mergeSelectOptions(providers: string[], accountGroups: string[], accountTypes: string[]): void {
    this.providerOptions = mergeProviderOptions(providers);
    this.accountGroupOptions = mergeStringOptions(DEFAULT_ACCOUNT_GROUP_OPTIONS, accountGroups);
    this.accountTypeOptions = mergeAccountTypeOptions(accountTypes);
  }

  private firstSupportedModel(raw?: string): string {
    const value = (raw || '').trim();
    if (!value || value === '*') return '';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return String(parsed[0] || '');
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)[0] || '';
    }
    return value;
  }

  private mergeModelOptions(values: Array<string | null | undefined>): string[] {
    return Array.from(
      new Set(
        [...this.modelOptions, ...values]
          .map((item) => (item || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private syncCustomProviderValidators(): void {
    const controls = [
      this.form.controls.apiBaseUrl,
      this.form.controls.supplierName,
      this.form.controls.officialUrl,
    ];
    if (this.isCustomProvider) {
      controls.forEach((control) => control.setValidators([Validators.required]));
    } else {
      controls.forEach((control) => control.clearValidators());
    }
    controls.forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
  }

  private syncApiBaseUrlWithProvider(provider: string): void {
    if (provider === 'custom') {
      const current = this.form.controls.apiBaseUrl.value.trim();
      if (Object.values(PROVIDER_API_BASE_URLS).includes(current)) {
        this.form.controls.apiBaseUrl.setValue('', { emitEvent: false });
      }
      return;
    }
    this.form.controls.apiBaseUrl.setValue(this.providerDefaultApiBaseUrl(provider), { emitEvent: false });
  }

  private providerDefaultApiBaseUrl(provider: string): string {
    return PROVIDER_API_BASE_URLS[(provider || '').trim()] || '';
  }

  private resolveApiBaseUrl(provider: string, value: string): string {
    return value.trim() || this.providerDefaultApiBaseUrl(provider);
  }

  private syncSecretValidators(): void {
    if (this.formMode === 'create') {
      this.form.controls.secret.setValidators([Validators.required]);
    } else {
      this.form.controls.secret.clearValidators();
    }
    this.form.controls.secret.updateValueAndValidity({ emitEvent: false });
  }

  private syncUsageConfigWithProvider(provider: string): void {
    const usageTypeControl = this.form.controls.usageQueryType;
    const usageUrlControl = this.form.controls.usageApiUrl;
    if (provider === 'codexzh') {
      usageTypeControl.setValue('codexzh', { emitEvent: false });
      if (!usageUrlControl.value.trim()) {
        usageUrlControl.setValue(this.defaultUsageApiUrl('codexzh'), { emitEvent: false });
      }
    } else if (provider === 'freemodel') {
      usageTypeControl.setValue('freemodel', { emitEvent: false });
      const current = usageUrlControl.value.trim();
      if (!current || current === this.defaultUsageApiUrl('codexzh')) {
        usageUrlControl.setValue(this.defaultUsageApiUrl('freemodel'), { emitEvent: false });
      }
    } else if (provider === 'tokeni') {
      usageTypeControl.setValue('tokeni', { emitEvent: false });
      const current = usageUrlControl.value.trim();
      if (!current || current === this.defaultUsageApiUrl('codexzh') || current === this.defaultUsageApiUrl('freemodel')) {
        usageUrlControl.setValue(this.defaultUsageApiUrl('tokeni'), { emitEvent: false });
      }
    } else if (provider !== 'custom') {
      usageTypeControl.setValue('', { emitEvent: false });
      usageUrlControl.setValue('', { emitEvent: false });
    }
    this.syncUsageApiUrlValidators();
  }

  private syncUsageApiUrlValidators(): void {
    const control = this.form.controls.usageApiUrl;
    if (this.needsUsageApiUrl) {
      control.setValidators([Validators.required]);
      if (!control.value.trim()) {
        control.setValue(this.defaultUsageApiUrl(this.form.controls.usageQueryType.value), { emitEvent: false });
      }
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private defaultUsageApiUrl(type: string): string {
    return USAGE_API_URLS[(type || '').trim()] || '';
  }

  private resolveUsageApiUrl(type: string, value: string): string {
    const usageType = (type || '').trim();
    if (!usageType) return '';
    return value.trim() || this.defaultUsageApiUrl(usageType);
  }

  private tryParseLoginCallbackFromLocation(): void {
    const callbackUrl = window.location.href;
    if (!this.hasLoginCallbackParams(callbackUrl) || this.form.controls.callbackUrl.value) {
      return;
    }
    this.form.controls.authType.setValue('login_callback');
    this.form.controls.callbackUrl.setValue(callbackUrl);
    this.parseLoginCallback();
  }

  private hasLoginCallbackParams(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      const keys = ['access_token', 'token', 'id_token', 'code', 'state'];
      if (keys.some((key) => parsed.searchParams.has(key))) {
        return true;
      }
      const fragment = parsed.hash.replace(/^#/, '');
      if (!fragment) {
        return false;
      }
      const fragmentParams = new URLSearchParams(fragment);
      return keys.some((key) => fragmentParams.has(key));
    } catch {
      return false;
    }
  }

  private buildOpenAIAuthorizeUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: OPENAI_OAUTH_CLIENT_ID,
      redirect_uri: OPENAI_OAUTH_REDIRECT_URI,
      scope: OPENAI_OAUTH_SCOPE,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      id_token_add_organizations: 'true',
      codex_cli_simplified_flow: 'true',
      state,
      originator: 'codex_cli_rs',
    });
    return `${OPENAI_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
  }

  private getCodeVerifierFromCallback(rawUrl: string): string {
    const state = this.getCallbackParam(rawUrl, 'state');
    if (!state) {
      return '';
    }
    return sessionStorage.getItem(this.oauthVerifierStorageKey(state)) || '';
  }

  private getCallbackParam(rawUrl: string, key: string): string {
    try {
      const parsed = new URL(rawUrl);
      const value = parsed.searchParams.get(key);
      if (value) {
        return value;
      }
      const fragment = parsed.hash.replace(/^#/, '');
      if (!fragment) {
        return '';
      }
      return new URLSearchParams(fragment).get(key) || '';
    } catch {
      return '';
    }
  }

  private oauthVerifierStorageKey(state: string): string {
    return `${OPENAI_OAUTH_VERIFIER_STORAGE_KEY}.${state}`;
  }

  private isOpenAICallbackOrigin(origin: string): boolean {
    return origin === 'http://localhost:1455' || origin === 'http://127.0.0.1:1455';
  }

  private randomBase64Url(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return this.bytesToBase64Url(bytes);
  }

  private async sha256Base64Url(value: string): Promise<string> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return this.bytesToBase64Url(new Uint8Array(digest));
  }

  private bytesToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
