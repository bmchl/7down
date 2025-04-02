import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CustomInputDialogData } from '@app/dialogs/custom-dialog-data';

@Component({
    selector: 'app-input-dialog',
    templateUrl: './input-dialog.component.html',
    styleUrls: ['./input-dialog.component.scss'],
})
export class InputDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: CustomInputDialogData, public dialogRef: MatDialogRef<InputDialogComponent>) {}
}
