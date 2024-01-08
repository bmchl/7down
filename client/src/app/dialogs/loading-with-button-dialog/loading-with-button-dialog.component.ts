import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CustomLoadingWithButtonDialogComponent } from './../custom-dialog-data';

@Component({
    selector: 'app-loading-with-button-dialog',
    templateUrl: './loading-with-button-dialog.component.html',
    styleUrls: ['./loading-with-button-dialog.component.scss'],
})
export class LoadingWithButtonDialogComponent {
    constructor(
        @Inject(MAT_DIALOG_DATA)
        public data: CustomLoadingWithButtonDialogComponent,
        public dialogRef: MatDialogRef<LoadingWithButtonDialogComponent>,
    ) {}
}
