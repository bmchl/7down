import { Component, Input } from '@angular/core';
import { GameData } from '@app/components/game-data';
import { AuthService } from '@app/services/auth-service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-hints',
    templateUrl: './hints.component.html',
    styleUrls: ['./hints.component.scss'],
})
export class HintsComponent {
    @Input() hero: GameData;
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
