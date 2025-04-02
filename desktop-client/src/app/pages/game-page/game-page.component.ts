import { Component, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TimeFormatting } from '@app/classes/time-formatting';
import { CanDeactiveComponent } from '@app/components/CanDeactivateGuard';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { WaitlistDialogComponent } from '@app/dialogs/waitlist-dialog/waitlist-dialog.component';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { NewMatch } from '@common/game';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-game-page',
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
})
export class GamePageComponent implements OnInit, OnDestroy, CanDeactiveComponent {
    @ViewChild(PlayAreaComponent) playArea: PlayAreaComponent;
    @ViewChild('replaySpeedButtons') replaySpeedButtons: any;
    time: TimeFormatting = new TimeFormatting();
    gameImages: string[] = [];
    differences: number[][][];
    replaySpeed: number = 1;
    loadingDialogRef: MatDialogRef<LoadingDialogComponent>;
    loadingWithButtonDialogRef: MatDialogRef<LoadingWithButtonDialogComponent>;
    acceptDenyDialogRef: MatDialogRef<WaitlistDialogComponent>;
    uid: string | null;
    isDarkMode: boolean = false;

    confirmationText = 'Êtes-vous sûr(e) de vouloir abandonner? 2';

    // eslint-disable-next-line max-params
    constructor(
        // private zone: NgZone,
        private zone: NgZone,
        private router: Router,
        public gameService: ClassicGameLogicService,
        public customDialogService: CustomDialogService,
        public localMessages: LocalMessagesService,
        private request: RequestService,
        public socketService: SocketClientService,
        public replayService: ReplayService,
        public authService: AuthService,
        public translateService: TranslateService,
    ) // private renderer: Renderer2,
    // @Inject(DOCUMENT) private document: Document,
    {}
    // @HostListener('window:popstate', ['$event'])

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
        return (
            this.gameService.spectator === false &&
            this.replayService.isSavedReplay === false &&
            this.gameService.match != undefined &&
            this.gameService.match.winnerSocketId == undefined
        );
    }

    onConfirm(): void {
        console.log('abandoing game');
        if (this.replayService.isSavedReplay) return;
        this.socketService.send(this.gameService.spectator ? 's/stop-spectating' : 'c/abandon-game');
        console.log('abandin!');
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

    // handleForfeit(): void {
    //     this.socketService.on('enemy-abandon', () => {
    //         this.localMessages.addMessage(MessageType.Abandonment, PlayerIndex.Player2);
    //         this.hero.isOver = true;
    //         this.customDialogService.openDialog({
    //             title: 'Votre adversaire a abandonné la partie. Vous avez gagné!',
    //             confirm: 'Revenir à la page principale',
    //             cancel: 'Rester sur la page de jeu',
    //             routerLink: '/',
    //         });
    //     });
    // }

    updateMatch = (data: { match: NewMatch }) => {
        this.gameService.match = data.match;
    };

    gameAbandonned = () => {
        this.zone.run(() => {
            this.router.navigate(['/classic']);
        });
    };

    async ngOnInit() {
        await this.socketService.connect();
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

        this.socketService.on('update-match', this.updateMatch);
        this.socketService.on('game-abandonned', this.gameAbandonned);
        if (!this.handleRefresh()) {
            this.request.getRequest(`games/${this.gameService.match?.mapId}`).subscribe((res: any) => {
                this.gameService.map = res;
                this.gameImages.push(res.image);
                this.gameImages.push(res.image1);
                this.differences = res.imageDifference;
                this.replayService.saveStartTime();
            });
        }
    }

    onSliderChange(value: string) {
        const newTime = (parseFloat(value) * this.replayService.gameTime) / 100;
        this.replayService.seekToTime(newTime);
    }
}
