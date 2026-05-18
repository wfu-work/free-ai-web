export interface AccountSelectOption {
  value: string;
  label: string;
}

export const DEFAULT_PROVIDER_OPTIONS: AccountSelectOption[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI Grok' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'azure-openai', label: 'Azure OpenAI' },
  { value: 'custom', label: '自定义供应商' },
];

export const DEFAULT_PROVIDER_VALUES = DEFAULT_PROVIDER_OPTIONS.map((item) => item.value);

export const DEFAULT_ACCOUNT_GROUP_OPTIONS = ['default'];

export const DEFAULT_ACCOUNT_TYPE_OPTIONS: AccountSelectOption[] = [
  { value: 'manual', label: '手动录入' },
  { value: 'shared', label: '共享池' },
  { value: 'dedicated', label: '独享账号' },
  { value: 'pool', label: '轮询池' },
];

export function mergeStringOptions(defaults: string[], values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      [...defaults, ...values]
        .map((item) => (item || '').trim())
        .filter(Boolean),
    ),
  );
}

export function mergeProviderOptions(values: Array<string | null | undefined>): AccountSelectOption[] {
  const base = new Map(DEFAULT_PROVIDER_OPTIONS.map((item) => [item.value, item]));
  values
    .map((item) => (item || '').trim())
    .filter(Boolean)
    .forEach((value) => {
      if (!base.has(value)) {
        base.set(value, { value, label: value });
      }
    });
  return Array.from(base.values());
}

export function getProviderLabel(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return '-';
  return DEFAULT_PROVIDER_OPTIONS.find((item) => item.value === normalized)?.label || normalized;
}

export function mergeAccountTypeOptions(values: Array<string | null | undefined>): AccountSelectOption[] {
  const base = new Map(DEFAULT_ACCOUNT_TYPE_OPTIONS.map((item) => [item.value, item]));
  values
    .map((item) => (item || '').trim())
    .filter(Boolean)
    .forEach((value) => {
      if (!base.has(value)) {
        base.set(value, { value, label: value });
      }
    });
  return Array.from(base.values());
}

export function getAccountTypeLabel(value?: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return '未设置';
  return DEFAULT_ACCOUNT_TYPE_OPTIONS.find((item) => item.value === normalized)?.label || normalized;
}
