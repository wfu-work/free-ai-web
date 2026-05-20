import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'logo',
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="Recodex Relay logo"
    >
      <defs>
        <linearGradient
          id="recodexLogoPaper"
          x1="210"
          y1="128"
          x2="814"
          y2="896"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="1" stop-color="var(--nm-primary-soft)" />
        </linearGradient>
        <linearGradient
          id="recodexLogoBubble"
          x1="312"
          y1="280"
          x2="700"
          y2="724"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="var(--nm-primary-hover)" />
          <stop offset=".42" stop-color="var(--nm-primary)" />
          <stop offset="1" stop-color="var(--nm-primary-active)" />
        </linearGradient>
        <filter
          id="recodexLogoBubbleShadow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          color-interpolation-filters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="18"
            stdDeviation="20"
            flood-color="var(--nm-primary-active)"
            flood-opacity=".42"
          />
        </filter>
      </defs>

      <rect width="1024" height="1024" rx="230" fill="url(#recodexLogoPaper)" />
      <g
        filter="url(#recodexLogoBubbleShadow)"
        transform="translate(512 512) scale(1.32) translate(-512 -512)"
      >
        <rect x="230" y="222" width="592" height="562" rx="188" fill="url(#recodexLogoBubble)" />
        <ellipse cx="526" cy="292" rx="226" ry="98" fill="#ffffff" fill-opacity=".2" />
        <path
          d="M366 444 466 546 366 648"
          fill="none"
          stroke="#edf6ff"
          stroke-width="52"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M552 660h166"
          fill="none"
          stroke="#edf6ff"
          stroke-width="52"
          stroke-linecap="round"
        />
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
export class LogoComponent {}
