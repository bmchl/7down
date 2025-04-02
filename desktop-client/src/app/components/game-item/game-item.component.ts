import { Component, Input, NgZone } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { TranslateService } from '@ngx-translate/core';
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
    uid: string | null;
    language: string;
    // NgZone parameter is required to avoid test errors
    // eslint-disable-next-line max-params
    constructor(
        private zone: NgZone,
        private router: Router,
        public gameService: ClassicGameLogicService,
        public customDialogService: CustomDialogService,
        public requestService: RequestService,
        public socketService: SocketClientService,
        public authService: AuthService,
        public translateService: TranslateService,
    ) {}

    ngOnInit(): void {
        (async () => {
            await this.socketService.connect();
            this.configureBaseSocketFeatures();

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

    configureBaseSocketFeatures() {
        this.socketService.on('update-game-button', (data: { gameId: string; gameOn: boolean }) => {
            if (data.gameId === this.game.id) {
                this.game.isGameOn = data.gameOn;
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

    markGameAsDeleted(): void {
        this.requestService.patchRequest(`games/${this.game.id}`, { deleted: true }).subscribe(() => {
            if (this.language === 'fr') {
                this.customDialogService.openDialog({
                    title: 'Le jeu a été supprimé avec succès.',
                    confirm: 'Fermer',
                });
            } else {
                this.customDialogService.openDialog({
                    title: 'The game has been successfully deleted.',
                    confirm: 'Close',
                });
            }
            this.game.deleted = true;
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
}
