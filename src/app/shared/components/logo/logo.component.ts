import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'logo',
  template: `
    <svg viewBox="0 0 1024 1024" role="img" aria-label="FreeAi logo">
      <rect
        class="logo-loop logo-loop-primary"
        x="346"
        y="126"
        width="332"
        height="772"
        rx="166"
        transform="rotate(45 512 512)"
      />
      <rect
        class="logo-loop logo-loop-secondary"
        x="346"
        y="126"
        width="332"
        height="772"
        rx="166"
        transform="rotate(-45 512 512)"
      />
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
        overflow: visible;
      }

      .logo-loop {
        fill: none;
        stroke-width: 88;
        transition: stroke 0.25s ease;
      }

      .logo-loop-primary {
        stroke: var(--nm-primary, #3448f4);
      }

      .logo-loop-secondary {
        stroke: var(--nm-primary-hover, #4f7dff);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {}
