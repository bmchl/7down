import { DOCUMENT } from '@angular/common';
import { Component, Inject, NgZone, OnInit, Renderer2 } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TimeLimitedDialogData } from '@app/dialogs/custom-dialog-data';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { TimeLimitedDialogComponent } from '@app/dialogs/time-limited-dialog/time-limited-dialog.component';
import { AuthService } from '@app/services/auth-service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
})
export class MainPageComponent implements OnInit {
    readonly title: string = '7 DOWN';
    loadingDialogRef: MatDialogRef<LoadingDialogComponent>;
    timeLimitedDialogRef: MatDialogRef<TimeLimitedDialogComponent>;
    isSoloGame: boolean;
    data: TimeLimitedDialogData = {
        input: '',
        solo: undefined,
    };
    uid: string | null;
    isDarkMode: boolean = false;

    // eslint-disable-next-line max-params
    constructor(
        public zone: NgZone,
        public customDialogService: CustomDialogService,
        private router: Router,
        private socketService: SocketClientService,
        public authService: AuthService,
        public translateService: TranslateService,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    async ngOnInit(): Promise<void> {
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
        this.socketService.on('game-filled-tl', () => {
            this.loadingDialogRef.close();
            this.zone.run(() => {
                this.router.navigate(['time-limit'], { queryParams: { solo: this.data.solo, playerName: this.data.input } });
            });
        });
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    onTimeLimitedClick(): void {
        this.timeLimitedDialogRef = this.customDialogService.openTimeLimitedDialog(this.data);
        this.timeLimitedDialogRef.afterClosed().subscribe(() => {
            if (this.data.solo !== undefined) {
                if (this.data.solo === false) {
                    this.loadingDialogRef = this.customDialogService.openLoadingDialog("En attente qu'un autre joueur rejoint la partie...");
                    this.socketService.send('join-waitlist-tl', { player0: this.data.input });
                } else {
                    this.zone.run(() => {
                        this.router.navigate(['time-limit'], { queryParams: { solo: this.data.solo, playerName: this.data.input } });
                    });
                }
            }
        });
    }
}
