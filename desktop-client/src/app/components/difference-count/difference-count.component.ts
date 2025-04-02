import { Component, Input } from '@angular/core';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-difference-count',
    templateUrl: './difference-count.component.html',
    styleUrls: ['./difference-count.component.scss'],
})
export class DifferenceCountComponent {
    @Input() index: number;
    uid: string | null;

    constructor(
        public gameService: ClassicGameLogicService,
        public socketService: SocketClientService,
        public authService: AuthService,
        public translateService: TranslateService,
    ) {}

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

    roundNumber(num: number): number {
        return Math.ceil(num);
    }
}
