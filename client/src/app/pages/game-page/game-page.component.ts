import { Component, HostListener, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TimeFormatting } from '@app/classes/time-formatting';
import { GameData, PlayerIndex } from '@app/components/game-data';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { Joiner } from '@app/dialogs/custom-dialog-data';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { WaitlistDialogComponent } from '@app/dialogs/waitlist-dialog/waitlist-dialog.component';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { MessageType } from '@app/services/game-message';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { Game } from './../../../../../common/game';

@Component({
    selector: 'app-game-page',
    templateUrl: './game-page.component.html',
    styleUrls: ['./game-page.component.scss'],
})
export class GamePageComponent implements OnInit, OnDestroy {
    @ViewChild(PlayAreaComponent) playArea: PlayAreaComponent;
    @ViewChild('replaySpeedButtons') replaySpeedButtons: any;
    time: TimeFormatting = new TimeFormatting();
    gameId: string;
    gameInfo: Game;
    gameImages: string[] = [];
    differences: number[][][];
    hero: GameData;
    isFull: boolean;
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
    };
    replaySpeed: number = 1;
    loadingDialogRef: MatDialogRef<LoadingDialogComponent>;
    loadingWithButtonDialogRef: MatDialogRef<LoadingWithButtonDialogComponent>;
    acceptDenyDialogRef: MatDialogRef<WaitlistDialogComponent>;
    // eslint-disable-next-line max-params
    constructor(
        private zone: NgZone,
        private router: Router,
        public gameService: ClassicGameLogicService,
        public customDialogService: CustomDialogService,
        public localMessages: LocalMessagesService,
        private request: RequestService,
        public socketService: SocketClientService,
        public replayService: ReplayService,
    ) {}
    @HostListener('window:popstate', ['$event'])
    abandonGame(): void {
        this.socketService.send('game-end', { matchId: this.hero.matchId, playerAbandoned: this.hero.playerName1 });
    }

    onGameDeleted = (data: any) => {
        if (data.gameId === this.hero.id) {
            this.zone.run(() => {
                if (this.loadingWithButtonDialogRef) this.loadingWithButtonDialogRef.close();
                if (this.acceptDenyDialogRef) this.acceptDenyDialogRef.close();
                this.router.navigate(['select']);
            });
            this.customDialogService.openErrorDialog({
                title: 'Partie supprimée',
                message: 'La partie a été supprimée par le hôte.',
            });
        }
    };

    initWaitingRoom = () => {
        const loadingDialogData = {
            title: "En attente qu'un autre joueur rejoint la partie...",
        };
        this.loadingWithButtonDialogRef = this.customDialogService.openLoadingWithButtonDialog(loadingDialogData);
        this.socketService.on('game-deleted', this.onGameDeleted);
        this.loadingWithButtonDialogRef.afterClosed().subscribe((canceled: boolean) => {
            if (canceled) {
                this.socketService.send('cancel-from-client', { gameId: this.hero.id });
                this.zone.run(() => {
                    this.router.navigate(['select']);
                });
            }
        });
    };

    ngOnDestroy() {
        if (this.socketService) this.socketService.removeAllListeners();
    }

    configureSoloEvents() {
        this.socketService.send('join-approval', { solo: true, gameId: this.hero.id, accept: true, player0: this.hero.playerName1, player1: 'N/A' });
        this.replayService.saveStartTime();
    }

    configureMultiCreatorEvents() {
        this.socketService.on('game-created', this.initWaitingRoom);

        this.socketService.on('game-started', (data: any) => {
            this.hero.startDate = data.startDate;
        });

        this.socketService.on('player-joined', (data: any) => {
            this.acceptDenyDialogRef?.close();
            this.loadingWithButtonDialogRef.close();

            const dialogData1 = {
                title: 'Demandes de rejoindre la partie',
                joiners: data.players,
                cancel: 'annuler',
            };
            this.acceptDenyDialogRef = this.customDialogService.openWaitlistDialog(dialogData1);

            this.acceptDenyDialogRef.afterClosed().subscribe((accept: boolean) => {
                // Ce dernier doit etre egal a undefined. On ne peut pas faire autrement !
                if (accept === undefined) return;
                const acceptedJoiner = data.players.find((player: Joiner) => player.accepted);
                if (!acceptedJoiner) return;
                this.socketService.send('join-approval', {
                    solo: false,
                    accept,
                    gameId: this.hero.id,
                    player0: this.hero.playerName1,
                    player1: acceptedJoiner.name,
                    joinerId: acceptedJoiner.id,
                });
                if (accept) {
                    this.hero.playerName2 = acceptedJoiner.name;
                    this.loadingWithButtonDialogRef.close();
                    this.isFull = true;
                    this.replayService.saveStartTime();
                    this.socketService.off('game-deleted', this.onGameDeleted);
                } else {
                    this.zone.run(() => {
                        this.router.navigate(['select']);
                    });
                }
            });
        });
    }

    configureMultiGuestEvents() {
        this.socketService.on('game-started', (data: any) => {
            this.loadingWithButtonDialogRef.close();
            this.hero.playerName2 = data.player0;
            this.hero.startDate = data.startDate;
            this.isFull = true;
            this.replayService.saveStartTime();
            this.socketService.off('game-deleted', this.onGameDeleted);
        });

        const loadingDialogData1 = {
            title: "En attente que l'autre joueur accepte...",
        };

        this.loadingWithButtonDialogRef = this.customDialogService.openLoadingWithButtonDialog(loadingDialogData1);
        this.socketService.on('game-deleted', this.onGameDeleted);
        this.loadingWithButtonDialogRef.afterClosed().subscribe((canceled: boolean) => {
            if (canceled) {
                this.socketService.send('cancel-from-joiner', this.hero.id);
                this.zone.run(() => {
                    this.router.navigate(['select']);
                });
            }
        });

        this.socketService.on('player-refuse', () => {
            this.loadingWithButtonDialogRef.close();
            this.zone.run(() => {
                this.router.navigate(['select']);
            });
            this.customDialogService.openErrorDialog({ title: 'Le créateur de la partie vous a refusé.', message: ' ' });
        });
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

    handleForfeit(): void {
        this.socketService.on('enemy-abandon', () => {
            this.localMessages.addMessage(MessageType.Abandonment, PlayerIndex.Player2);
            this.hero.isOver = true;
            this.customDialogService.openDialog({
                title: 'Votre adversaire a abandonné la partie. Vous avez gagné!',
                confirm: 'Revenir à la page principale',
                cancel: 'Rester sur la page de jeu',
                routerLink: '/',
            });
        });
    }

    ngOnInit() {
        this.hero = this.gameService.hero ? this.gameService.hero : this.defaultHero;
        if (this.hero === this.defaultHero) {
            this.gameService.onUndefinedHero();
        }
        if (this.hero.multiplayer) {
            if (this.hero.isHost) this.configureMultiCreatorEvents();
            // Ce dernier doit etre egal a false. On ne peut pas faire autrement !
            else if (!this.hero.isHost) this.configureMultiGuestEvents();
            this.handleForfeit();
        } else {
            this.configureSoloEvents();
        }
        if (!this.handleRefresh()) {
            this.gameId = this.hero.id;
            this.request.getRequest(`games/${this.gameId}`).subscribe((res: any) => {
                this.gameInfo = res;
                this.hero.differenceCount = this.gameInfo.differenceCount;
                this.gameImages.push(this.gameInfo.image);
                this.gameImages.push(this.gameInfo.image1);
                this.differences = this.gameInfo.imageDifference;
                this.hero.isOver = false;
            });
        }
    }
}
