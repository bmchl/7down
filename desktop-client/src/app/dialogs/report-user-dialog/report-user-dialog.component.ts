import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@app/services/auth-service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-report-user-dialog',
    templateUrl: './report-user-dialog.component.html',
    styleUrls: ['./report-user-dialog.component.scss'],
})
export class ReportUserDialogComponent {
    selectedReason: string = '';
    uid: string | null;
    constructor(
        public dialogRef: MatDialogRef<ReportUserDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public authService: AuthService,
        public translateService: TranslateService,
    ) {}

    ngOnInit(): void {
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

    cancel(): void {
        this.dialogRef.close();
    }

    submitReport(): void {
        if (this.selectedReason) {
            // Send the report with the selected reason
            this.dialogRef.close(this.selectedReason);
        }
    }
}
