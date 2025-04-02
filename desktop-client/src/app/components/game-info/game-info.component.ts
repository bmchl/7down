import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-game-info',
    templateUrl: './game-info.component.html',
    styleUrls: ['./game-info.component.scss'],
    styles: [':host {width: 100%;}'],
})
export class GameInfoComponent {
    uid: string | null;
    language: string;
    constructor(
        public customDialogService: CustomDialogService,
        public localMessages: LocalMessagesService,
        public socketService: SocketClientService,
        public gameService: ClassicGameLogicService,
        public authService: AuthService,
        public translateService: TranslateService,
        public router: Router,
        public replayService: ReplayService,
    ) {}

    ngOnInit() {
        (async () => {
            await this.socketService.connect();

            if (!sessionStorage.getItem('user_uid')) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            this.language = await this.authService.getLanguage(this.uid);
            this.translateService.use(this.language);
        })();
    }

    get gameName() {
        return (
            (this.gameService.map != undefined ? this.gameService.map : this.gameService.match.games?.[this.gameService.match.gamesIndex ?? 0])
                ?.gameName ?? ''
        );
    }

    triggerStopSpectating() {
        this.socketService.send('s/stop-spectating');
        this.router.navigate(['/classic']);
    }

    triggerQuitDialog() {
        if (this.language === 'fr') {
            this.customDialogService
                .openDialog({
                    title: 'Êtes-vous sûr(e) de vouloir abandonner? 1',
                    cancel: 'Revenir',
                    confirm: 'Abandonner',
                    routerLink: this.gameService.match?.gamemode === 'time-limit' ? '/' : '/classic',
                })
                .afterClosed()
                .subscribe((confirm: boolean) => {
                    if (confirm) this.socketService.send('c/abandon-game');
                });
        } else {
            this.customDialogService
                .openDialog({
                    title: 'Are you sure you want to quit?',
                    cancel: 'Go back',
                    confirm: 'Quit',
                    routerLink: this.gameService.match?.gamemode === 'time-limit' ? '/' : '/classic',
                })
                .afterClosed()
                .subscribe((confirm: boolean) => {
                    if (confirm) this.socketService.send('c/abandon-game');
                });
        }
    }
}
