import { Location } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
    @Input() hideBack: boolean;
    @Input() title: string;
    constructor(public location: Location) {}
    backClicked() {
        this.location.back();
    }
}
