import { Component, OnInit } from '@angular/core';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { Match } from '@common/game';

@Component({
    selector: 'app-game-history',
    templateUrl: './game-history.component.html',
    styleUrls: ['./game-history.component.scss'],
})
export class GameHistoryComponent implements OnInit {
    matches: Match[] = [];

    displayedColumns = ['startDate', 'startTime', 'gameMode', 'playerMode', 'player1', 'player2', 'gameTime'];
    constructor(private request: RequestService, public customDialogService: CustomDialogService) {}

    ngOnInit() {
        this.request.getRequest('games/history').subscribe((res: any) => {
            this.matches = res.map((match: Match) => {
                const formattedStartDate = this.formatDate(match.startDate);
                const responseTime = this.getCurrentTime(match.startDate);
                const classicMode = match.multiplayer && !match.timeLimit ? 'Multi' : 'Solo';
                const gameTime = this.formatTime(match.completionTime);
                const gameMode = match.timeLimit ? 'Temps limité' : 'Classique';
                const timeLimitedMode = match.timeLimit && match.multiplayer ? 'Coop' : 'Solo';
                const playerMode = !match.timeLimit ? classicMode : timeLimitedMode;

                return { ...match, formattedStartDate, responseTime, playerMode, gameTime, gameMode };
            });
        });
    }

    formatTime(completionTime: number): string {
        const gameTime = Math.floor(completionTime / 1000);
        const minutes = Math.floor(gameTime / 60);
        const seconds = gameTime % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getCurrentTime(timestamp: number): string {
        const now = new Date(timestamp);
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        return formattedDate;
    }

    deleteHistory(): void {
        this.customDialogService
            .openDialog({
                title: "Êtes-vous sûr(e) de vouloir supprimer l'historique de jeux?",
                confirm: 'Effacer',
                cancel: 'Annuler',
            })
            .afterClosed()
            .subscribe((confirm: boolean) => {
                if (confirm) {
                    this.request.deleteRequest('games/history').subscribe((res: any) => {
                        const deletedCount = res.deletedCount;
                        if (deletedCount !== 0) {
                            this.matches = [];
                            this.customDialogService.openDialog({
                                title: "L'historique de jeu a été supprimé avec succès.",
                                confirm: 'OK',
                            });
                        } else {
                            this.customDialogService.openErrorDialog({
                                title: 'Suppression échouée',
                                message: "L'historique de jeu n'a pas pu être supprimé.",
                            });
                        }
                    });
                }
            });
    }
}
