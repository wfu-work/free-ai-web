import { Pipe, PipeTransform } from '@angular/core';

import { translateErrorMessage } from '../utils/error-message.util';

@Pipe({
  name: 'errorMessage',
  standalone: true,
  pure: true,
})
export class ErrorMessagePipe implements PipeTransform {
  transform(value: unknown): string {
    return translateErrorMessage(value);
  }
}
