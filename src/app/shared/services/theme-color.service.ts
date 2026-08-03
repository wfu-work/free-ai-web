import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeModeOption {
  key: ThemeMode;
  label: string;
}

export interface ThemeColorPreset {
  key: string;
  label: string;
  primary: string;
  hover: string;
  active: string;
  soft: string;
  tint: string;
  rgb: string;
}

const COLOR_STORAGE_KEY = 'recodex_relay_theme_color';
const MODE_STORAGE_KEY = 'recodex_relay_theme_mode';
const DARK_STYLESHEET_ID = 'freeai-dark-theme';
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

export const THEME_MODE_OPTIONS: ThemeModeOption[] = [
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
  { key: 'system', label: '跟随系统' },
];

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    key: 'recodex-blue',
    label: '深海蓝',
    primary: '#3448f4',
    hover: '#4f7dff',
    active: '#2434c9',
    soft: '#eef3ff',
    tint: '#f6f8ff',
    rgb: '52 72 244',
  },
  {
    key: 'sky',
    label: '晴空蓝',
    primary: '#1677ff',
    hover: '#4096ff',
    active: '#0958d9',
    soft: '#eef5ff',
    tint: '#f5f9ff',
    rgb: '22 119 255',
  },
  {
    key: 'bubble',
    label: '气泡蓝',
    primary: '#6fa7ff',
    hover: '#88b7ff',
    active: '#3f75df',
    soft: '#edf5ff',
    tint: '#f7fbff',
    rgb: '111 167 255',
  },
  {
    key: 'teal',
    label: '湖青',
    primary: '#0f8b8d',
    hover: '#14b8a6',
    active: '#0f6f72',
    soft: '#eaf9f8',
    tint: '#f3fcfb',
    rgb: '15 139 141',
  },
  {
    key: 'mint',
    label: '薄荷绿',
    primary: '#1f9d68',
    hover: '#34c38f',
    active: '#177a50',
    soft: '#edf9f4',
    tint: '#f6fcf9',
    rgb: '31 157 104',
  },
  {
    key: 'violet',
    label: '堇紫',
    primary: '#6f42c1',
    hover: '#8b5cf6',
    active: '#59359a',
    soft: '#f3effc',
    tint: '#faf7ff',
    rgb: '111 66 193',
  },
  {
    key: 'cyan',
    label: '青蓝',
    primary: '#0891b2',
    hover: '#06b6d4',
    active: '#0e7490',
    soft: '#ecfeff',
    tint: '#f3fcfd',
    rgb: '8 145 178',
  },
  {
    key: 'slate',
    label: '深海蓝',
    primary: '#315c85',
    hover: '#4d7aa5',
    active: '#244564',
    soft: '#eef4f9',
    tint: '#f6f9fc',
    rgb: '49 92 133',
  },
  {
    key: 'indigo',
    label: '靛青',
    primary: '#4851d6',
    hover: '#6670ee',
    active: '#343caf',
    soft: '#eff1ff',
    tint: '#f7f8ff',
    rgb: '72 81 214',
  },
  {
    key: 'amber',
    label: '琥珀',
    primary: '#c77700',
    hover: '#f59e0b',
    active: '#9a5c00',
    soft: '#fff7e6',
    tint: '#fffaf0',
    rgb: '199 119 0',
  },
  {
    key: 'coral',
    label: '珊瑚橙',
    primary: '#dd6b4d',
    hover: '#f08a5d',
    active: '#b85237',
    soft: '#fff1ec',
    tint: '#fff8f5',
    rgb: '221 107 77',
  },
  {
    key: 'rose',
    label: '玫瑰粉',
    primary: '#c85a7c',
    hover: '#df7698',
    active: '#a84766',
    soft: '#fff0f5',
    tint: '#fff7fa',
    rgb: '200 90 124',
  },
];

@Injectable({ providedIn: 'root' })
export class ThemeColorService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly key = signal(THEME_COLOR_PRESETS[0].key);
  private readonly mode = signal<ThemeMode>('system');
  private readonly effective = signal<Exclude<ThemeMode, 'system'>>('light');
  private systemThemeQuery: MediaQueryList | null = null;

  readonly presets = THEME_COLOR_PRESETS;
  readonly modes = THEME_MODE_OPTIONS;
  readonly currentKey = this.key.asReadonly();
  readonly current = computed(() => this.findPreset(this.key()));
  readonly currentMode = this.mode.asReadonly();
  readonly effectiveMode = this.effective.asReadonly();

  constructor() {
    this.listenToSystemTheme();
    this.restore();
  }

  /** 应用强调色并持久化用户选择。 */
  apply(key: string): void {
    const preset = this.findPreset(key);
    this.key.set(preset.key);
    this.writeVariables(preset);
    this.writeStorage(COLOR_STORAGE_KEY, preset.key);
  }

  /** 切换浅色、深色或跟随系统模式。 */
  applyMode(mode: ThemeMode): void {
    const nextMode = this.isThemeMode(mode) ? mode : 'system';
    this.mode.set(nextMode);
    this.applyEffectiveMode(this.resolveEffectiveMode(nextMode));
    this.writeStorage(MODE_STORAGE_KEY, nextMode);
  }

  /** 从本地存储恢复主题，存储数据异常时回退到默认值。 */
  restore(): void {
    const storedKey = this.readStorage(COLOR_STORAGE_KEY);
    const preset = this.findPreset(storedKey || THEME_COLOR_PRESETS[0].key);
    const storedMode = this.readStorage(MODE_STORAGE_KEY);
    const mode = this.isThemeMode(storedMode) ? storedMode : 'system';

    this.key.set(preset.key);
    this.mode.set(mode);
    this.applyEffectiveMode(this.resolveEffectiveMode(mode));
  }

  /** 查找强调色预设，不存在的键统一回退到首个预设。 */
  private findPreset(key: string): ThemeColorPreset {
    return THEME_COLOR_PRESETS.find((preset) => preset.key === key) ?? THEME_COLOR_PRESETS[0];
  }

  /** 将强调色写入 CSS 变量，深色模式下使用半透明底色保证对比度。 */
  private writeVariables(preset: ThemeColorPreset): void {
    const root = this.document.documentElement;
    const dark = this.effective() === 'dark';

    root.style.setProperty('--nm-primary', preset.primary);
    root.style.setProperty('--nm-primary-hover', preset.hover);
    root.style.setProperty('--nm-primary-active', preset.active);
    root.style.setProperty('--nm-primary-soft', dark ? `rgb(${preset.rgb} / 20%)` : preset.soft);
    root.style.setProperty('--nm-primary-tint', dark ? `rgb(${preset.rgb} / 11%)` : preset.tint);
    root.style.setProperty('--nm-primary-rgb', preset.rgb);
  }

  /** 监听操作系统主题变化，仅在“跟随系统”模式下同步界面。 */
  private listenToSystemTheme(): void {
    if (!this.isBrowser || typeof window.matchMedia !== 'function') return;

    this.systemThemeQuery = window.matchMedia(SYSTEM_DARK_QUERY);
    this.systemThemeQuery.addEventListener('change', this.handleSystemThemeChange);
    this.destroyRef.onDestroy(() => {
      this.systemThemeQuery?.removeEventListener('change', this.handleSystemThemeChange);
    });
  }

  /** 根据用户模式和系统偏好计算当前真正生效的明暗主题。 */
  private resolveEffectiveMode(mode: ThemeMode): Exclude<ThemeMode, 'system'> {
    if (mode !== 'system') return mode;
    return this.systemThemeQuery?.matches ? 'dark' : 'light';
  }

  /** 更新根节点标记，并启停 Ant Design 官方暗色样式。 */
  private applyEffectiveMode(mode: Exclude<ThemeMode, 'system'>): void {
    const root = this.document.documentElement;

    this.effective.set(mode);
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
    this.toggleDarkStylesheet(mode === 'dark');
    this.writeVariables(this.current());
  }

  /** 暗色资源只创建一次，后续切换通过 disabled 属性复用浏览器缓存。 */
  private toggleDarkStylesheet(enabled: boolean): void {
    if (!this.isBrowser) return;

    let stylesheet = this.document.getElementById(DARK_STYLESHEET_ID) as HTMLLinkElement | null;
    if (!stylesheet && enabled) {
      stylesheet = this.document.createElement('link');
      stylesheet.id = DARK_STYLESHEET_ID;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = new URL('assets/style.dark.css', this.document.baseURI).toString();
      this.document.head.appendChild(stylesheet);
    }
    if (stylesheet) stylesheet.disabled = !enabled;
  }

  /** 判断存储值是否为受支持的主题模式。 */
  private isThemeMode(mode: string | null): mode is ThemeMode {
    return THEME_MODE_OPTIONS.some((option) => option.key === mode);
  }

  /** 安全读取本地存储，兼容浏览器隐私策略禁用存储的情况。 */
  private readStorage(key: string): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** 安全写入本地存储，写入失败不影响当前主题切换。 */
  private writeStorage(key: string, value: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // 私密浏览或存储配额异常时，仍保留当前会话内的主题状态。
    }
  }

  private readonly handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (this.mode() !== 'system') return;
    this.applyEffectiveMode(event.matches ? 'dark' : 'light');
  };
}
