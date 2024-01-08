import { Component, NgZone, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TimeLimitedDialogData } from '@app/dialogs/custom-dialog-data';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { TimeLimitedDialogComponent } from '@app/dialogs/time-limited-dialog/time-limited-dialog.component';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { SocketClientService } from '@app/services/socket-client.service';

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

    // eslint-disable-next-line max-params
    constructor(
        public zone: NgZone,
        public customDialogService: CustomDialogService,
        private router: Router,
        private socketService: SocketClientService,
    ) {
        this.socketService.connect();
    }

    ngOnInit(): void {
        this.socketService.on('game-filled-tl', () => {
            this.loadingDialogRef.close();
            this.zone.run(() => {
                this.router.navigate(['time-limit'], { queryParams: { solo: this.data.solo, playerName: this.data.input } });
            });
        });
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
