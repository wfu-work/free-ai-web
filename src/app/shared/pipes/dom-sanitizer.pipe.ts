import { inject, Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml,
  SafeResourceUrl,
  SafeScript,
  SafeStyle,
  SafeUrl,
} from '@angular/platform-browser';

@Pipe({
  name: 'domSanitizer',
})
export class DomSanitizerPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(
    value: string,
    type: 'html' | 'url' | 'style' | 'resourceUrl' | 'script' = 'url',
  ): SafeHtml | SafeUrl | SafeStyle | SafeResourceUrl | SafeScript {
    switch (type) {
      case 'html':
        return this.sanitizer.bypassSecurityTrustHtml(value);
      case 'url':
        return this.sanitizer.bypassSecurityTrustUrl(value);
      case 'style':
        return this.sanitizer.bypassSecurityTrustStyle(value);
      case 'resourceUrl':
        return this.sanitizer.bypassSecurityTrustResourceUrl(value);
      case 'script':
        return this.sanitizer.bypassSecurityTrustScript(value);
      default:
        return this.sanitizer.bypassSecurityTrustUrl(value);
    }
  }
}
