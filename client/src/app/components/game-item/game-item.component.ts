import { Component, Input, NgZone } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { environment } from 'src/environments/environment';
import { Constants, Game } from './../../../../../common/game';
import { GameData } from './../game-data';

@Component({
    selector: 'app-game-item',
    templateUrl: './game-item.component.html',
    styleUrls: ['./game-item.component.scss'],
})
export class GameItemComponent {
    @Input() game: Game;
    @Input() constants: Constants;
    @Input() configOn: boolean;
    serverPath = environment.serverUrl;
    // *** Les deux variables ci-dessous que vous avez qualifies de inutiles sont necessaires. Ils reviennent dans le HTML. ***
    displayedColumns: string[] = ['position', 'player-name', 'record-time'];
    loadingDialogRef: MatDialogRef<LoadingDialogComponent>;
    loadingWithButtonDialogRef: MatDialogRef<LoadingWithButtonDialogComponent>;
    acceptDenyDialogRef: MatDialogRef<BasicDialogComponent>;
    // NgZone parameter is required to avoid test errors
    // eslint-disable-next-line max-params
    constructor(
        private zone: NgZone,
        private router: Router,
        public gameService: ClassicGameLogicService,
        public customDialogService: CustomDialogService,
        public requestService: RequestService,
        public socketService: SocketClientService,
    ) {
        this.socketService.connect();
        this.configureBaseSocketFeatures();
    }

    configureBaseSocketFeatures() {
        this.socketService.on('update-game-button', (data: { gameId: string; gameOn: boolean }) => {
            if (data.gameId === this.game.id) {
                this.game.isGameOn = data.gameOn;
            }
        });
    }

    createGame(): void {
        const dialogData = {
            title: 'Entrez votre nom',
            inputLabel: 'Nom de joueur',
            cancel: 'Revenir',
            confirm: 'Confirmer',
            input: '',
        };
        this.customDialogService
            .openInputDialog(dialogData)
            .afterClosed()
            .subscribe((submit: boolean) => {
                if (submit) {
                    const newGame: GameData = {
                        id: this.game.id,
                        name: this.game.gameName,
                        mode: 'classique',
                        difficulty: this.game.difficulty,
                        multiplayer: false,
                        penalty: this.constants?.penalty,
                        differenceCount: this.game.differenceCount,
                        differencesFound1: 0,
                        differencesFound2: 0,
                        hintsUsed: 0,
                        startDate: 0,
                        playerName1: dialogData.input,
                        playerName2: '',
                    };
                    this.gameService.hero = newGame;
                    this.zone.run(() => {
                        this.router.navigate(['game']);
                    });
                }
            });
    }

    resetTimes(): void {
        this.socketService.send('reset-scores', { gameId: this.game.id });
    }

    deleteGame(): void {
        this.customDialogService
            .openDialog({
                title: 'Êtes-vous sûr(e) de vouloir effacer ce jeu?',
                confirm: 'Effacer',
                cancel: 'Annuler',
            })
            .afterClosed()
            .subscribe((confirm: boolean) => {
                if (confirm) {
                    this.requestService.deleteRequest(`games/${this.game.id}`).subscribe((res: any) => {
                        if (res.status === 200) {
                            this.socketService.send('game-deleted', { gameId: this.game.id });
                            this.customDialogService
                                .openDialog({
                                    title: 'La partie a été supprimée avec succès.',
                                    confirm: 'Fermer',
                                })
                                .afterClosed()
                                .subscribe(() => {
                                    this.zone.run(() => {
                                        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
                                            this.zone.run(() => {
                                                this.router.navigate(['config']);
                                            });
                                        });
                                    });
                                });
                        } else {
                            this.customDialogService.openErrorDialog({
                                title: 'Suppression échouée',
                                message: 'La partie ne peut être supprimée.',
                            });
                        }
                    });
                }
            });
    }

    createNewGame(dialogData: any, isHost: boolean): GameData {
        return {
            id: this.game.id,
            matchId: '',
            name: this.game.gameName,
            mode: 'classique',
            difficulty: this.game.difficulty,
            penalty: this.game.penalty,
            differenceCount: this.game.differenceCount,
            multiplayer: true,
            hintsUsed: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            startDate: 0,
            playerName1: dialogData.input,
            playerName2: '',
            isHost,
        };
    }

    createMultiGame(): void {
        const dialogData = {
            title: 'Entrez votre nom',
            inputLabel: 'Nom de joueur',
            cancel: 'Revenir',
            confirm: 'Confirmer',
            input: '',
        };
        this.customDialogService
            .openInputDialog(dialogData)
            .afterClosed()
            .subscribe((submit: boolean) => {
                if (submit) {
                    this.socketService.send('create-game', { gameId: this.game.id, player0: dialogData.input });

                    const newGame: GameData = this.createNewGame(dialogData, true);

                    this.gameService.hero = newGame;
                    this.zone.run(() => {
                        this.router.navigate(['game']);
                    });
                }
            });
    }

    joinMultiGame(): void {
        const dialogData = {
            title: 'Entrez votre nom',
            inputLabel: 'Nom de joueur',
            cancel: 'Revenir',
            confirm: 'Confirmer',
            input: '',
        };
        this.customDialogService
            .openInputDialog(dialogData)
            .afterClosed()
            .subscribe((submit: boolean) => {
                if (submit) {
                    this.socketService.send('join-game', { gameId: this.game.id, player1: dialogData.input });
                    const newGame: GameData = this.createNewGame(dialogData, false);

                    this.gameService.hero = newGame;
                    this.zone.run(() => {
                        this.router.navigate(['game']);
                    });
                }
            });
    }
}
