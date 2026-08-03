export const DEFAULT_ACCOUNT_GROUP_OPTIONS = ['default'];

export type OfficialVendorCode = 'openai' | 'google' | 'anthropic';

export interface OfficialVendorOption {
  value: OfficialVendorCode;
  label: string;
}

export const DEFAULT_OFFICIAL_VENDOR_CODE: OfficialVendorCode = 'openai';

export const OFFICIAL_VENDOR_OPTIONS: readonly OfficialVendorOption[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Gemini' },
  { value: 'anthropic', label: 'Claude Code' },
];

export function normalizeOfficialVendorCode(value?: string): OfficialVendorCode {
  const normalized = (value || '').trim().toLowerCase();
  return OFFICIAL_VENDOR_OPTIONS.some((item) => item.value === normalized)
    ? (normalized as OfficialVendorCode)
    : DEFAULT_OFFICIAL_VENDOR_CODE;
}

export function mergeStringOptions(
  defaults: string[],
  values: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set([...defaults, ...values].map((item) => (item || '').trim()).filter(Boolean)),
  );
}
