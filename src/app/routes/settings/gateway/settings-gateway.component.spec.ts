import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SettingsGatewayComponent } from './settings-gateway.component';

describe('Gateway proxy controls', () => {
  let fixture: ComponentFixture<SettingsGatewayComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    localStorage.clear();
    localStorage.setItem(
      'freeai.gateway.config',
      JSON.stringify({ upstreamProxyUrl: 'socks5://old-user:old-password@proxy.example:1080' }),
    );
    await TestBed.configureTestingModule({
      imports: [SettingsGatewayComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(SettingsGatewayComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('/ops/gateway-config').flush({});
    fixture.detectChanges();
    http
      .match((request) => request.url.startsWith('assets/'))
      .forEach((request) =>
        request.flush(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0"/></svg>',
        ),
      );
  });

  afterEach(() => {
    try {
      http.verify();
    } finally {
      fixture?.destroy();
      TestBed.resetTestingModule();
    }
  });

  function button(label: string): HTMLButtonElement {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const match = buttons.find((element) => element.textContent?.trim() === label);
    expect(match, `missing ${label} button`).toBeDefined();
    return match!;
  }

  it('removes the legacy browser cache containing proxy credentials', () => {
    expect(localStorage.getItem('freeai.gateway.config')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('old-password');
  });

  it('sends replacement credentials only in the request body and clears them after saving', () => {
    const username = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyUsername"]',
    ) as HTMLInputElement;
    const password = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyPassword"] input',
    ) as HTMLInputElement;
    expect(username, 'missing proxy username input').not.toBeNull();
    expect(password, 'missing proxy password input').not.toBeNull();
    expect(password.type).toBe('password');
    const address = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyUrl"]',
    ) as HTMLInputElement;
    address.value = 'socks5://proxy.example:1080';
    address.dispatchEvent(new Event('input'));
    username.value = 'private-user';
    username.dispatchEvent(new Event('input'));
    password.value = 'private-password';
    password.dispatchEvent(new Event('input'));
    fixture.nativeElement.querySelector('[formControlName="upstreamProxyEnabled"] input').click();
    fixture.detectChanges();
    button('保存配置').click();
    const request = http.expectOne('/ops/gateway-config');
    expect(request.request.body.upstreamProxyUrl).toBe('socks5://proxy.example:1080');
    expect(request.request.body.upstreamProxyCredentials).toEqual({
      username: 'private-user',
      password: 'private-password',
    });
    request.flush({
      upstreamProxyUrl: 'socks5://proxy.example:1080',
      upstreamProxyHasCredentials: true,
    });
    fixture.detectChanges();
    expect(username.value).toBe('');
    expect(password.value).toBe('');
    expect(localStorage.getItem('freeai.gateway.config')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('已保存代理认证');
  });

  it('tests a saved proxy without requesting its password from the server', () => {
    fixture.destroy();
    fixture = TestBed.createComponent(SettingsGatewayComponent);
    fixture.detectChanges();
    http.expectOne('/ops/gateway-config').flush({
      upstreamProxyEnabled: true,
      upstreamProxyUrl: 'socks5://proxy.example:1080',
      upstreamProxyHasCredentials: true,
    });
    fixture.detectChanges();
    button('测试代理').click();
    const request = http.expectOne('/ops/upstream-proxy-test');
    expect(request.request.body.upstreamProxyUrl).toBe('socks5://proxy.example:1080');
    expect(request.request.body.upstreamProxyCredentials).toBeUndefined();
    request.flush({ exitIp: '203.0.113.17', checks: [] });
    fixture.detectChanges();
    expect(localStorage.getItem('freeai.gateway.config')).toBeNull();
  });

  it('tests the entered proxy and renders its exit IP without saving configuration', () => {
    const input = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyUrl"]',
    ) as HTMLInputElement;
    input.value = 'socks5://user:password@proxy.example:1080';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button('测试代理').click();
    const request = http.expectOne('/ops/upstream-proxy-test');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.upstreamProxyUrl).toBe('socks5://user:password@proxy.example:1080');
    request.flush({
      exitIp: '203.0.113.17',
      proxyAddress: 'socks5://proxy.example:1080',
      checkedAt: 1,
      checks: [
        {
          name: '出口 IP',
          reachable: true,
          statusCode: 200,
          latencyMs: 12,
          message: '已获取出口 IP',
        },
        {
          name: 'OpenAI API',
          reachable: true,
          statusCode: 401,
          latencyMs: 24,
          message: '连接成功；未验证账号权限',
        },
      ],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('203.0.113.17');
    expect(fixture.nativeElement.textContent).toContain('401');
    http.expectNone((pending) => pending.method === 'PUT');
  });

  it('blocks saving required-proxy mode while the proxy switch is off', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('label'),
    ) as HTMLLabelElement[];
    const required = labels.find((element) => element.textContent?.includes('必须使用代理'));
    expect(required, 'missing required-proxy control').toBeDefined();
    required!.click();
    fixture.detectChanges();
    button('保存配置').click();
    http.expectNone((pending) => pending.method === 'PUT');
  });

  it('persists required-proxy mode together with the entered address', () => {
    const enabled = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyEnabled"] input',
    ) as HTMLInputElement;
    const required = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyRequired"] input',
    ) as HTMLInputElement;
    enabled.click();
    required.click();
    const input = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyUrl"]',
    ) as HTMLInputElement;
    input.value = '  socks5://proxy.example:1080  ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button('保存配置').click();
    const request = http.expectOne('/ops/gateway-config');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.upstreamProxyRequired).toBe(true);
    expect(request.request.body.upstreamProxyEnabled).toBe(true);
    expect(request.request.body.upstreamProxyUrl).toBe('socks5://proxy.example:1080');
    request.flush(request.request.body);
  });

  it('hides a completed test when the proxy address changes and allows retry after an error', () => {
    const input = fixture.nativeElement.querySelector(
      '[formControlName="upstreamProxyUrl"]',
    ) as HTMLInputElement;
    input.value = 'socks5://proxy.example:1080';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    button('测试代理').click();
    http.expectOne('/ops/upstream-proxy-test').flush({ exitIp: '203.0.113.17', checks: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('203.0.113.17');
    input.value = 'socks5://other.example:1080';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('203.0.113.17');
    button('测试代理').click();
    http
      .expectOne('/ops/upstream-proxy-test')
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('测试失败');
    expect(button('测试代理').disabled).toBe(false);
  });
});
