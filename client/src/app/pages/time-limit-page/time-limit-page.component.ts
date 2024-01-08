import { Component, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { GameData, PlayerIndex } from '@app/components/game-data';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { DrawService } from '@app/services/draw.service';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { Game } from '@common/game';
import { MainPageComponent } from './../main-page/main-page.component';

@Component({
    selector: 'app-time-limit-page',
    templateUrl: './time-limit-page.component.html',
    styleUrls: ['./time-limit-page.component.scss'],
})
export class TimeLimitPageComponent implements OnInit, OnDestroy {
    @ViewChild(PlayAreaComponent) playArea: PlayAreaComponent;
    isSolo: boolean;
    gameId: string;
    gameInfo: Game;
    gameImages: string[] = [];
    differences: number[][][];
    defaultHero: GameData = {
        id: '',
        name: '',
        mode: '',
        difficulty: 0,
        multiplayer: false,
        penalty: 0,
        differenceCount: 0,
        differencesFound1: 0,
        differencesFound2: 0,
        hintsUsed: 0,
        startDate: 0,
        playerName1: '',
        playerName2: '',
        isOver: false,
    };
    hero: GameData = this.defaultHero;

    games: Game[] = [];
    index: number = 0;

    loadingDialogRef: MatDialogRef<LoadingDialogComponent>;
    loadingWithButtonDialogRef: MatDialogRef<LoadingWithButtonDialogComponent>;
    acceptDenyDialogRef: MatDialogRef<BasicDialogComponent>;
    mainPageComponent: MainPageComponent;

    // eslint-disable-next-line max-params
    constructor(
        public gameService: ClassicGameLogicService,
        public customDialogService: CustomDialogService,
        public localMessages: LocalMessagesService,
        public socketService: SocketClientService,
        private route: ActivatedRoute,
        public drawService: DrawService,
        private router: Router,
        private zone: NgZone,
    ) {}

    @HostListener('window:beforeunload', ['$event'])
    onWindowReload() {
        localStorage.setItem('refreshing', 'true');
        this.abandonGame();
    }

    @HostListener('window:popstate', ['$event'])
    abandonGame(): void {
        this.socketService.send('abandon-game-tl');
    }

    determineGameMode(): void {
        this.route.queryParams.subscribe((params) => {
            this.isSolo = params['solo'] === 'true';
            this.hero.playerName1 = params['playerName'];
            this.hero.multiplayer = !this.isSolo;
        });
    }

    ngOnDestroy() {
        if (this.socketService) this.socketService.removeAllListeners();
    }

    handleRefresh(): boolean {
        if (this.hero === this.defaultHero) {
            this.gameService.onUndefinedHero();
            return true;
        } else {
            return false;
        }
    }

    getPlayerName(index: PlayerIndex): string {
        let result = '';
        switch (index) {
            case PlayerIndex.Player1: {
                result = this.hero.playerName1;
                break;
            }
            case PlayerIndex.Player2: {
                result = this.hero.playerName2;
                break;
            }
        }
        return result;
    }

    timerEnd = () => {
        this.hero.isOver = true;
        this.customDialogService.openDialog({
            title: `Félicitations! Vous avez parcouru ${this.index} fiches!`,
            confirm: 'Revenir à la page principale',
            cancel: 'Rester sur la page de jeu',
            routerLink: '/',
        });
        this.socketService.send('timer-end-tl');
    };

    ngOnInit() {
        if (localStorage.getItem('refreshing') === 'true') {
            localStorage.removeItem('refreshing');
            this.zone.run(() => {
                this.router.navigate(['/home']);
            });
            return;
        }
        this.determineGameMode();
        this.socketService.connect();
        this.socketService.on('random-games', (data: any) => {
            this.games = data.games;
            this.gameImages.push(data.games[this.index].image);
            this.gameImages.push(data.games[this.index].image1);
            this.differences = data.games[this.index].imageDifference;
            this.hero.mode = 'tl';
            this.hero.differenceCount = data.games.length;
            this.hero.initialTime = data.constants.initialTime;
            this.hero.penalty = data.constants.penalty;
            this.hero.gain = data.constants.timeGainPerDiff;
            this.hero.playerName2 = data.player0 === this.hero.playerName1 ? data.player1 : data.player0;
            this.hero.isOver = false;
            this.drawService.isWaiting = false;
        });

        if (this.isSolo) this.socketService.send('create-game-tl', { player0: this.hero.playerName1, solo: this.isSolo });

        this.socketService.on('player-abandonned', () => {
            this.hero.multiplayer = false;
            this.isSolo = true;
        });

        this.socketService.on('validate-coords-tl', (data: any) => {
            if (data.res >= 0) {
                if (this.hero.initialTime && this.hero.gain) this.hero.initialTime += +this.hero.gain;
                this.drawService.drawDifference();
                this.index++;
                this.hero.differencesFound1++;
                if (data.gameEnded) {
                    this.hero.isOver = true;
                    this.customDialogService.openDialog({
                        title: `Félicitations! Vous avez parcouru ${this.index} fiches!`,
                        confirm: 'Revenir à la page principale',
                        cancel: 'Rester sur la page de jeu',
                        routerLink: '/',
                    });
                    return;
                }
                this.gameImages[0] = this.games[this.index].image;
                this.gameImages[1] = this.games[this.index].image1;
                this.differences = this.games[this.index].imageDifference;
            } else {
                this.drawService.drawError(data.x, data.y);
            }
            this.drawService.isWaiting = false;
        });
    }
}
