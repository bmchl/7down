import { Component, Input } from '@angular/core';
import { TimeFormatting } from '@app/classes/time-formatting';
import { AuthService } from '@app/services/auth-service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-leaderboards',
    templateUrl: './leaderboards.component.html',
    styleUrls: ['./leaderboards.component.scss'],
})
export class LeaderboardsComponent {
    @Input() solo: object[];
    @Input() multi: object[];
    displayedColumns: string[] = ['position', 'player-name', 'record-time'];
    time: TimeFormatting = new TimeFormatting();
    uid: string | null;

    constructor(public authService: AuthService, public translateService: TranslateService) {}

    ngOnInit() {
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
