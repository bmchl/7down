import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CustomImageDialogData } from '@app/dialogs/custom-dialog-data';
import { DrawService } from '@app/services/draw.service';

@Component({
    selector: 'app-diff-dialog',
    templateUrl: './diff-dialog.component.html',
    styleUrls: ['./diff-dialog.component.scss'],
})
export class DiffDialogComponent implements AfterViewInit {
    @ViewChild('diffCanvas', { static: false }) canvas0!: ElementRef<HTMLCanvasElement>;

    constructor(
        readonly drawService: DrawService,
        public dialogRef: MatDialogRef<DiffDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CustomImageDialogData,
    ) {}
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
