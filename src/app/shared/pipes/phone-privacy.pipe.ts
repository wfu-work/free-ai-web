import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phonePrivacy',
})
export class PhonePrivacyPipe implements PipeTransform {
  transform(value: string): string {
    return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}
