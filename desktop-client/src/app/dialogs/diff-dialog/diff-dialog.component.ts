import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CustomImageDialogData } from '@app/dialogs/custom-dialog-data';
import { AuthService } from '@app/services/auth-service';
import { DrawService } from '@app/services/draw.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-diff-dialog',
    templateUrl: './diff-dialog.component.html',
    styleUrls: ['./diff-dialog.component.scss'],
})
export class DiffDialogComponent implements AfterViewInit {
    @ViewChild('diffCanvas', { static: false }) canvas0!: ElementRef<HTMLCanvasElement>;
    uid: string | null;

    constructor(
        readonly drawService: DrawService,
        public dialogRef: MatDialogRef<DiffDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CustomImageDialogData,
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
    async ngAfterViewInit(): Promise<void> {
        this.drawService.context = this.canvas0.nativeElement.getContext('2d') as CanvasRenderingContext2D;
        this.drawService.context.fillStyle = 'white';
        this.drawService.context.fillRect(0, 0, 640, 480);
        for (const row of this.data.img) {
            for (const pixel of row) {
                this.drawService.context.fillStyle = 'black';
                this.drawService.context.fillRect(pixel[0], pixel[1], 1, 1);
            }
        }
    }
}
