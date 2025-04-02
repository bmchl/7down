import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CreateMatchDialogData } from '../custom-dialog-data';

@Component({
    selector: 'app-create-match-dialog',
    templateUrl: './create-match-dialog.component.html',
    styleUrls: ['./create-match-dialog.component.scss'],
})
export class CreateMatchDialogComponent implements OnInit {
    constructor(@Inject(MAT_DIALOG_DATA) public data: CreateMatchDialogData, public dialogRef: MatDialogRef<CreateMatchDialogComponent>) {}

    ngOnInit() {}
}
