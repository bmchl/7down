import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TimeLimitedDialogData } from './../custom-dialog-data';

@Component({
    selector: 'app-time-limited-dialog',
    templateUrl: './time-limited-dialog.component.html',
    styleUrls: ['./time-limited-dialog.component.scss'],
})
export class TimeLimitedDialogComponent {
    solo: boolean;
    constructor(@Inject(MAT_DIALOG_DATA) public data: TimeLimitedDialogData, public dialogRef: MatDialogRef<TimeLimitedDialogComponent>) {}

    triggerStart(): void {
        this.data.solo = this.solo;
        this.dialogRef.close();
    }
}
