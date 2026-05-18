import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'logo',
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="FreeAi logo">
      <defs>
        <linearGradient [attr.id]="ids.core" x1="196" y1="142" x2="842" y2="888" gradientUnits="userSpaceOnUse">
          <stop offset="0" style="stop-color: var(--nm-primary-hover)" />
          <stop offset=".46" style="stop-color: var(--nm-primary)" />
          <stop offset="1" style="stop-color: var(--nm-primary-active)" />
        </linearGradient>
        <linearGradient [attr.id]="ids.ai" x1="394" y1="418" x2="610" y2="644" gradientUnits="userSpaceOnUse">
          <stop offset="0" style="stop-color: var(--nm-primary-hover)" />
          <stop offset=".5" style="stop-color: var(--nm-primary)" />
          <stop offset="1" style="stop-color: var(--nm-primary-active)" />
        </linearGradient>
        <radialGradient [attr.id]="ids.glow" cx="36%" cy="24%" r="76%">
          <stop offset="0" stop-color="#ffffff" stop-opacity=".34" />
          <stop offset=".56" stop-color="#ffffff" stop-opacity=".11" />
          <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
        <filter
          [attr.id]="ids.shadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          color-interpolation-filters="sRGB"
        >
          <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="var(--nm-primary-active)" flood-opacity=".22" />
        </filter>
      </defs>

      <g [attr.filter]="'url(#' + ids.shadow + ')'">
        <rect x="132" y="132" width="760" height="760" rx="228" [attr.fill]="'url(#' + ids.core + ')'" />
        <rect
          x="146"
          y="146"
          width="732"
          height="732"
          rx="214"
          fill="none"
          stroke="#dbe4ff"
          stroke-opacity=".22"
          stroke-width="12"
        />
        <ellipse cx="432" cy="254" rx="280" ry="132" [attr.fill]="'url(#' + ids.glow + ')'" />
      </g>

      <path
        fill="#f5f8ff"
        d="M350 678c-72 0-128-52-128-118 0-55 40-101 95-113 16-98 99-170 205-170 92 0 172 56 199 137 69 2 125 54 125 116 0 82-69 148-154 148H350z"
      />

      <g
        fill="none"
        [attr.stroke]="'url(#' + ids.ai + ')'"
        stroke-width="42"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M420 550 512 474 604 550" />
        <path d="M512 474v102" />
      </g>

      <g [attr.fill]="'url(#' + ids.ai + ')'">
        <circle cx="420" cy="550" r="32" />
        <circle cx="512" cy="474" r="38" />
        <circle cx="604" cy="550" r="32" />
        <circle cx="512" cy="592" r="28" />
      </g>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex: 0 0 auto;
        aspect-ratio: 1;
      }

      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  protected readonly ids = (() => {
    const suffix = Math.random().toString(36).slice(2, 9);
    return {
      core: `freeai-logo-core-${suffix}`,
      ai: `freeai-logo-ai-${suffix}`,
      glow: `freeai-logo-glow-${suffix}`,
      shadow: `freeai-logo-shadow-${suffix}`,
    };
  })();
}
