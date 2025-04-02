import { Component, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CanDeactiveComponent } from '@app/components/CanDeactivateGuard';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { DrawService } from '@app/services/draw.service';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { Game, NewMatch } from '@common/game';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-time-limit-page',
    templateUrl: './time-limit-page.component.html',
    styleUrls: ['./time-limit-page.component.scss'],
})
export class TimeLimitPageComponent implements OnInit, OnDestroy, CanDeactiveComponent {
    @ViewChild(PlayAreaComponent) playArea: PlayAreaComponent;
    isSolo: boolean;
    gameId: string;
    gameInfo: Game;
    gameImages: string[] = [];
    differences: number[][][];
    uid: string | null;
    language: string;

    loadingDialogRef: MatDialogRef<LoadingDialogComponent>;
    loadingWithButtonDialogRef: MatDialogRef<LoadingWithButtonDialogComponent>;
    acceptDenyDialogRef: MatDialogRef<BasicDialogComponent>;

    confirmationText = 'Êtes-vous sûr(e) de vouloir abandonner?';

    // eslint-disable-next-line max-params
    constructor(
        public gameService: ClassicGameLogicService,
        public customDialogService: CustomDialogService,
        public localMessages: LocalMessagesService,
        public socketService: SocketClientService,
        // private route: ActivatedRoute,
        public drawService: DrawService,
        private router: Router,
        private zone: NgZone,
        public translateService: TranslateService,
        public authService: AuthService,
    ) {}

    @HostListener('window:beforeunload', ['$event']) unloadHandler(event: Event) {
        if (this.needsConfirmation()) {
            const confirmation = confirm(this.confirmationText);
            if (confirmation) {
                this.onConfirm();
            }
            return confirmation;
        }
        this.onConfirm();
        return true;
    }

    needsConfirmation(): boolean {
        return this.gameService.spectator === false && this.gameService.match != undefined && this.gameService.match.winnerSocketId == undefined;
    }

    onConfirm(): void {
        this.socketService.send(this.gameService.spectator ? 's/stop-spectating' : 'tl/abandon-game');
    }

    ngOnDestroy() {
        if (this.socketService) this.socketService.removeAllListeners();
    }

    handleRefresh(): boolean {
        if (this.gameService.match == undefined) {
            this.gameService.onUndefinedMatch();
            return true;
        } else {
            return false;
        }
    }

    timerEnd = () => {
        if (this.language === 'fr') {
            this.customDialogService.openDialog({
                title: `Félicitations! Vous avez parcouru ${this.gameService.match.gamesIndex} fiches!`,
                confirm: 'Revenir à la page principale',
                cancel: 'Rester sur la page de jeu',
                routerLink: '/',
            });
        } else {
            this.customDialogService.openDialog({
                title: `Congratulations! You have gone through ${this.gameService.match.gamesIndex} cards!`,
                confirm: 'Return to main page',
                cancel: 'Stay on game page',
                routerLink: '/',
            });
        }

        this.socketService.send('timer-end-tl');
    };

    updateMatch = (data: { match: NewMatch }) => {
        console.log('updating match', data.match);
        this.gameService.match = data.match;
        const currentIndex = this.gameService.match.gamesIndex ?? 0;
        this.gameImages = [this.gameService.match.games?.[currentIndex].image ?? '', this.gameService.match.games?.[currentIndex].image1 ?? ''];
        this.differences = this.gameService.match.games?.[currentIndex].imageDifference ?? [];
        console.log('updateMatch', this.differences);
    };

    async ngOnInit() {
        (async () => {
            if (!sessionStorage.getItem('user_uid')) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            try {
                this.language = await this.authService.getLanguage(this.uid);
                this.translateService.use(this.language);
                if (this.language === 'fr') {
                    this.confirmationText = 'Quitter cette page quittera également le lobby. Êtes-vous sûr?';
                }
            } catch (error) {
                console.error('Error setting user language:', error);
            }
        })();
        await this.socketService.connect();
        this.socketService.on('update-match', this.updateMatch);
        if (localStorage.getItem('refreshing') === 'true') {
            localStorage.removeItem('refreshing');
            this.zone.run(() => {
                this.router.navigate(['/time-limit-lobby']);
            });
            return;
        }

        console.log('time limit started with', this.gameService.match);

        this.gameImages = [this.gameService.match.games?.[0].image ?? '', this.gameService.match.games?.[0].image1 ?? ''];
        this.differences = this.gameService.match.games?.[0].imageDifference ?? [];

        // this.socketService.on('validate-coords-tl', (data: any) => {
        //     if (data.res >= 0) {
        //         if (this.hero.initialTime && this.hero.gain) this.hero.initialTime += +this.hero.gain;
        //         this.drawService.drawDifference();
        //         this.index++;
        //         this.hero.differencesFound1++;
        //         if (data.gameEnded) {
        //             this.hero.isOver = true;
        //             this.customDialogService.openDialog({
        //                 title: `Félicitations! Vous avez parcouru ${this.index} fiches!`,
        //                 confirm: 'Revenir à la page principale',
        //                 cancel: 'Rester sur la page de jeu',
        //                 routerLink: '/',
        //             });
        //             return;
        //         }
        //         this.gameImages[0] = this.games[this.index].image;
        //         this.gameImages[1] = this.games[this.index].image1;
        //         this.differences = this.games[this.index].imageDifference;
        //     } else {
        //         this.drawService.drawError(data.x, data.y);
        //     }
        //     this.drawService.isWaiting = false;
        // });
    }
}
