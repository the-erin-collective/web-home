import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UiInfobarBottomComponent } from './ui-infobar-bottom/ui-infobar-bottom.component';
import { UiInfobarTopComponent } from './ui-infobar-top/ui-infobar-top.component';
import { UiSidebarLeftComponent } from './ui-sidebar-left/ui-sidebar-left.component';
import { UiSidebarRightComponent } from './ui-sidebar-right/ui-sidebar-right.component';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        UiInfobarBottomComponent,
        UiInfobarTopComponent,
        UiSidebarLeftComponent,
        UiSidebarRightComponent,
        CommonModule
    ]
})
export class UiComponent implements OnInit {

  public constructor() { 
    console.debug('UiComponent constructor called');
  }

  public ngOnInit(): void {
    console.debug('UiComponent ngOnInit called');
  }

}
