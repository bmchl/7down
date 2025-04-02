import { DOCUMENT } from '@angular/common';
import { Component, Inject, Renderer2 } from '@angular/core';
import { AuthService } from '@app/services/auth-service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-config-page',
    templateUrl: './config-page.component.html',
    styleUrls: ['./config-page.component.scss'],
})
export class ConfigPageComponent {
    uid: string | null;
    isDarkMode: boolean = false;
    isChatMinimized: boolean = true;
    passwordEntered: boolean = false;
    passwordInput: string = '';
    language: string;

    constructor(
        private requestService: RequestService,
        public dialogService: CustomDialogService,
        private socketService: SocketClientService,
        public authService: AuthService,
        private translateService: TranslateService,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
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

    checkPassword(): void {
        if (this.passwordInput === '7down') {
            this.passwordEntered = true;
        } else {
            if (this.language === 'fr') alert('Mauvais mot de passe. Réessayez.');
            else {
                alert('Wrong password. Try Again.');
            }
        }
    }

    toggleChatMinimize(): void {
        this.isChatMinimized = !this.isChatMinimized;
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    deleteAllGames() {
        this.socketService.send('delete-all-games');
    }

    resetGameHistory() {
        this.socketService.send('reset-game-history');
    }

    resetTimes() {
        this.socketService.send('reset-scores');
    }

    resetConsts() {
        this.requestService
            .putRequest('games/consts', {
                initialTime: '30',
                penalty: '5',
                timeGainPerDiff: '5',
            })
            .subscribe();
    }
}
