import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { RequestService } from '@app/services/request.service';

@Component({
    selector: 'app-game-constants-dialog',
    templateUrl: './game-constants-dialog.component.html',
    styleUrls: ['./game-constants-dialog.component.scss'],
})
export class GameConstantsDialogComponent implements OnInit {
    myForm: FormGroup;

    constructor(private fb: FormBuilder, private requestService: RequestService, private dialogRef: MatDialogRef<GameConstantsDialogComponent>) {}

    ngOnInit() {
        this.myForm = this.fb.group({
            initialTime: [30, [Validators.required, Validators.min(10), Validators.max(120)]],
            penalty: [5, [Validators.required, Validators.min(3), Validators.max(20)]],
            timeGainPerDiff: [5, [Validators.required, Validators.min(3), Validators.max(20)]],
        });

        this.requestService.getRequest('games/consts').subscribe(({ initialTime, penalty, timeGainPerDiff }: any) => {
            this.myForm.setValue({ initialTime, penalty, timeGainPerDiff });
        });
    }

    saveConsts() {
        if (!this.myForm.valid) return;
        this.requestService
            .putRequest('games/consts', {
                initialTime: this.myForm.get('initialTime')?.value,
                penalty: this.myForm.get('penalty')?.value,
                timeGainPerDiff: this.myForm.get('timeGainPerDiff')?.value,
            })
            .subscribe(() => this.dialogRef.close());
    }
}
