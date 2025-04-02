import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@app/services/auth-service';
import { TranslateService } from '@ngx-translate/core';
import { TimeLimitedDialogData } from './../custom-dialog-data';

@Component({
    selector: 'app-time-limited-dialog',
    templateUrl: './time-limited-dialog.component.html',
    styleUrls: ['./time-limited-dialog.component.scss'],
})
export class TimeLimitedDialogComponent {
    solo: boolean;
    uid: string | null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: TimeLimitedDialogData,
        public dialogRef: MatDialogRef<TimeLimitedDialogComponent>,
        public authService: AuthService,
        public translateService: TranslateService,
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
        })();
    }

    triggerStart(): void {
        this.data.solo = this.solo;
        this.dialogRef.close();
    }
}
