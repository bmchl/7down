import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@app/services/auth-service';
import { TranslateService } from '@ngx-translate/core';
import { CustomLoadingWithButtonDialogComponent } from './../custom-dialog-data';

@Component({
    selector: 'app-loading-with-button-dialog',
    templateUrl: './loading-with-button-dialog.component.html',
    styleUrls: ['./loading-with-button-dialog.component.scss'],
})
export class LoadingWithButtonDialogComponent {
    uid: string | null;

    constructor(
        @Inject(MAT_DIALOG_DATA)
        public data: CustomLoadingWithButtonDialogComponent,
        public dialogRef: MatDialogRef<LoadingWithButtonDialogComponent>,
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
}
