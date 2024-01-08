import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CustomDialogData } from '@app/dialogs/custom-dialog-data';

@Component({
    selector: 'app-basic-dialog',
    templateUrl: './basic-dialog.component.html',
    styleUrls: ['./basic-dialog.component.scss'],
})
export class BasicDialogComponent {
    constructor(public dialogRef: MatDialogRef<BasicDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: CustomDialogData) {}
}
