import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

import { BasicHeaderComponent } from './widgets/header';
import { BasicMenusComponent } from './widgets/menus';
import { ThemeColorService } from '../../shared/services/theme-color.service';

@Component({
  selector: 'layout-basic',
  templateUrl: './basic.component.html',
  styleUrls: ['./basic.component.less'],
  imports: [
    RouterOutlet,
    NgClass,
    NzDrawerModule,
    NzLayoutModule,
    BasicHeaderComponent,
    BasicMenusComponent,
  ],
})
export class LayoutBasic {
  protected readonly themeColor = inject(ThemeColorService);
  protected isCollapsed = false;
  protected mobileMenuVisible = false;
  protected readonly mobileDrawerBodyStyle = {
    height: '100%',
    padding: '0',
  };

  protected toggleNavigation(): void {
    if (window.matchMedia('(max-width: 767px)').matches) {
      this.mobileMenuVisible = true;
      return;
    }
    this.isCollapsed = !this.isCollapsed;
  }

  protected closeMobileMenu(): void {
    this.mobileMenuVisible = false;
  }
}
