import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { AuthService } from '@app/services/auth-service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { NewMatch } from '@common/game';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-game-history',
    templateUrl: './game-history.component.html',
    styleUrls: ['./game-history.component.scss'],
})
export class GameHistoryComponent implements OnInit {
    matches: NewMatch[] = [];
    uid: string | null;
    isDarkMode: boolean = false;
    username: string;

    displayedColumns = ['players', 'gameDuration', 'gameMode', 'startTime', 'startDate', 'playerMode', 'gameTime', 'winnerUsername'];
    constructor(
        private request: RequestService,
        public customDialogService: CustomDialogService,
        public authService: AuthService,
        public translateService: TranslateService,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
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
            this.fetchGameHistory();
        })();
    }

    // async fetchLoggedInUsername(): Promise<string> {
    //     if (!this.uid) {
    //         console.error('User ID is not available.');
    //         return '';
    //     }
    //     const db = getDatabase();
    //     const userRef = ref(db, `users/${this.uid}/username`);
    //     const snapshot = await get(userRef);
    //     if (snapshot.exists()) {
    //         return snapshot.val();
    //     } else {
    //         console.warn(`Username not found for UID: ${this.uid}`);
    //         return '';
    //     }
    // }

    // ...

    // async fetchGameHistory() {
    //     this.request.getRequest('games/history?uid=' + this.uid).subscribe((res: any) => {
    //         const sortedMatches: NewMatch[] = res.sort((a: NewMatch, b: NewMatch) => b.startTime - a.startTime);

    //         this.matches = sortedMatches.filter(match => !match.pendingDeletion).map((match: NewMatch) => {
    //             const formattedStartDate = this.formatDate(match.startTime);
    //             const responseTime = this.getCurrentTime(match.startTime);
    //             const gameMode = match.gamemode === 'classic' ? 'Classique' : 'Temps limité';
    //             const playerMode = match.players.length.toString();

    //             return { ...match, formattedStartDate, responseTime, gameMode, playerMode };
    //         });
    //     });
    // }

    async fetchGameHistory() {
        this.request.getRequest(`games/history?uid=${this.uid}`).subscribe((res: any) => {
            const filteredMatches: NewMatch[] = res.filter((match: NewMatch) => {
                const currentUser = match.players.find((player) => player.uid === this.uid);
                return !(currentUser && currentUser.requestedDeletion);
            });

            this.matches = filteredMatches.sort((a: NewMatch, b: NewMatch) => b.startTime - a.startTime);

            this.matches = filteredMatches
                .map((match: NewMatch) => {
                    const isPendingDeletion = match.pendingDeletion;
                    const formattedStartDate = this.formatDate(match.startTime);
                    const responseTime = this.getCurrentTime(match.startTime);
                    const gameMode = match.gamemode === 'classic' ? 'Classique' : 'Temps limité';
                    const playerMode = match.players.length.toString();

                    // Calculate game duration, use current time if endTime not provided
                    const endTime = match.endTime ?? Date.now();
                    const gameTime = this.formatGameTime(match.startTime, endTime);

                    const winnerUsername = match.players.find((p) => p.id === match.winnerSocketId)?.name ?? 'N/A';

                    return {
                        ...match,
                        formattedStartDate,
                        responseTime,
                        gameMode,
                        playerMode,
                        gameTime,
                        pendingDeletion: isPendingDeletion,
                        winnerUsername,
                    };
                })
                .filter((match) => !match.pendingDeletion);
        });
    }

    formatGameTime(startTime: number, endTime: number): string {
        const completionTime = endTime - startTime;
        return this.formatTime(completionTime);
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    formatTime(completionTime: number): string {
        const gameTime = Math.floor(completionTime / 1000); // Convert milliseconds to seconds
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
                    this.request.deleteRequest(`games/history/${this.uid}`).subscribe(
                        (res: any) => {
                            if (res.deletedCount !== 0) {
                                // If games are actually deleted, clear the matches
                                this.matches = this.matches.filter((m) => !m.pendingDeletion);
                                this.customDialogService.openDialog({
                                    title: "L'historique de jeu a été supprimé avec succès.",
                                    confirm: 'OK',
                                });
                            } else {
                                // If no games are deleted, it means the request for deletion is pending
                                this.matches.forEach((match) => {
                                    if (!match.pendingDeletion) {
                                        match.pendingDeletion = true;
                                    }
                                });
                                this.customDialogService.openDialog({
                                    title: 'Votre demande de suppression est enregistrée et en attente de confirmation des autres joueurs.',
                                    confirm: 'OK',
                                });
                            }
                        },
                        (error) => {
                            this.customDialogService.openErrorDialog({
                                title: 'Suppression échouée',
                                message: "L'historique de jeu n'a pas pu être supprimé. Veuillez réessayer plus tard.",
                            });
                        },
                    );
                }
            });
    }
}
