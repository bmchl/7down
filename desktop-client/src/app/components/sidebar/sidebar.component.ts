import { Component, OnInit } from '@angular/core';
import { AuthService } from '@app/services/auth-service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    styles: [':host {position: fixed; top: 0; left: 0;}'],
})
export class SidebarComponent implements OnInit {
    uid: string | null;
    constructor(public authService: AuthService, public translateService: TranslateService) {}

    ngOnInit(): void {
        (async () => {
            if (!sessionStorage.getItem('user_uid')) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            const language = await this.authService.getLanguage(this.uid);
            this.translateService.use(language);
        })();
    }
}
