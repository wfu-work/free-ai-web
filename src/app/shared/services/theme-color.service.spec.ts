import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeColorService } from './theme-color.service';

describe('ThemeColorService', () => {
  let systemDark = false;
  let listeners: Set<(event: MediaQueryListEvent) => void>;

  beforeEach(() => {
    systemDark = false;
    listeners = new Set();
    const mediaQuery = {
      get matches() {
        return systemDark;
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      ),
      removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
      ),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    } as unknown as MediaQueryList;

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mediaQuery),
    );
    localStorage.clear();
    document.getElementById('freeai-dark-theme')?.remove();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
    TestBed.configureTestingModule({ providers: [ThemeColorService] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.getElementById('freeai-dark-theme')?.remove();
  });

  it('默认跟随系统并实时响应系统主题变化', () => {
    const service = TestBed.inject(ThemeColorService);

    expect(service.currentMode()).toBe('system');
    expect(service.effectiveMode()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');

    emitSystemTheme(true);

    expect(service.effectiveMode()).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(getDarkStylesheet()?.disabled).toBe(false);
  });

  it('可以在浅色和深色模式间切换并复用暗色样式', () => {
    const service = TestBed.inject(ThemeColorService);

    service.applyMode('dark');
    const stylesheet = getDarkStylesheet();
    expect(service.currentMode()).toBe('dark');
    expect(stylesheet?.href).toContain('/assets/style.dark.css');
    expect(localStorage.getItem('recodex_relay_theme_mode')).toBe('dark');

    service.applyMode('light');
    expect(service.effectiveMode()).toBe('light');
    expect(stylesheet?.disabled).toBe(true);
  });

  it('恢复已保存的主题模式和强调色', () => {
    localStorage.setItem('recodex_relay_theme_mode', 'dark');
    localStorage.setItem('recodex_relay_theme_color', 'teal');

    const service = TestBed.inject(ThemeColorService);

    expect(service.currentMode()).toBe('dark');
    expect(service.currentKey()).toBe('teal');
    expect(document.documentElement.style.getPropertyValue('--nm-primary')).toBe('#0f8b8d');
  });

  function emitSystemTheme(matches: boolean): void {
    systemDark = matches;
    const event = { matches, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  }

  function getDarkStylesheet(): HTMLLinkElement | null {
    return document.getElementById('freeai-dark-theme') as HTMLLinkElement | null;
  }
});
