import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ControlWidget, DelonFormModule } from '@delon/form';

@Component({
  selector: 'test',
  template: `
    <sf-item-wrap
      [id]="id"
      [schema]="schema"
      [ui]="ui"
      [showError]="showError"
      [error]="error"
      [showTitle]="schema.title"
    >
      test widget
    </sf-item-wrap>
  `,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DelonFormModule],
})
export class TestWidget extends ControlWidget {
  static readonly KEY = 'test';
}
