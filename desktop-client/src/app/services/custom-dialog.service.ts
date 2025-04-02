import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { CreateMatchDialogComponent } from '@app/dialogs/create-match-dialog/create-match-dialog.component';
import {
    CreateMatchDialogData,
    CustomDialogData,
    CustomErrorDialogData,
    CustomImageDialogData,
    CustomInputDialogData,
    CustomLoadingWithButtonDialogComponent,
    TimeLimitedDialogData,
    WaitlistDialogData,
} from '@app/dialogs/custom-dialog-data';
import { DiffDialogComponent } from '@app/dialogs/diff-dialog/diff-dialog.component';
import { ErrorDialogComponent } from '@app/dialogs/error-dialog/error-dialog.component';
import { GameConstantsDialogComponent } from '@app/dialogs/game-constants-dialog/game-constants-dialog.component';
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { TimeLimitedDialogComponent } from '@app/dialogs/time-limited-dialog/time-limited-dialog.component';
import { WaitlistDialogComponent } from '@app/dialogs/waitlist-dialog/waitlist-dialog.component';
import { AddFriendPageComponent } from '@app/pages/add-friend-page/add-friend-page.component';

@Injectable({
    providedIn: 'root',
})
export class CustomDialogService {
    constructor(public dialog: MatDialog) {}

    openDialog(data: CustomDialogData): MatDialogRef<BasicDialogComponent, any> {
        const dialogRef = this.dialog.open(BasicDialogComponent, {
            data,
        });
        return dialogRef;
    }

    openInputDialog(data: CustomInputDialogData): MatDialogRef<InputDialogComponent, any> {
        const dialogRef = this.dialog.open(InputDialogComponent, {
            data,
        });
        return dialogRef;
    }

    openErrorDialog(data: CustomErrorDialogData): MatDialogRef<ErrorDialogComponent, any> {
        const dialogRef = this.dialog.open(ErrorDialogComponent, {
            data,
        });
        return dialogRef;
    }

    openImageDialog(data: CustomImageDialogData) {
        const dialogRef = this.dialog.open(DiffDialogComponent, {
            data,
        });
        return dialogRef;
    }
    openLoadingDialog(title: string) {
        const dialogRef = this.dialog.open(LoadingDialogComponent, {
            data: title,
        });
        dialogRef.disableClose = true;
        return dialogRef;
    }

    openCreateMatchDialog(data: CreateMatchDialogData) {
        const dialogRef = this.dialog.open(CreateMatchDialogComponent, {
            data,
            width: '20%',
        });
        dialogRef.disableClose = true;
        return dialogRef;
    }

    openTimeLimitedDialog(data: TimeLimitedDialogData) {
        const dialogRef = this.dialog.open(TimeLimitedDialogComponent, {
            data,
            width: '20%',
        });
        dialogRef.disableClose = true;
        return dialogRef;
    }

    openSearchDialog() {
        const dialogRef = this.dialog.open(AddFriendPageComponent, {
            width: '40%',
        });
        return dialogRef;
    }

    openLoadingWithButtonDialog(data: CustomLoadingWithButtonDialogComponent): MatDialogRef<LoadingWithButtonDialogComponent, any> {
        const dialogRef = this.dialog.open(LoadingWithButtonDialogComponent, {
            data,
            width: '20%',
        });
        dialogRef.disableClose = true;
        return dialogRef;
    }

    openConstantsDialog() {
        this.dialog.open(GameConstantsDialogComponent, { width: '30%' });
    }

    openWaitlistDialog(data: WaitlistDialogData): MatDialogRef<WaitlistDialogComponent, any> {
        const dialogRef = this.dialog.open(WaitlistDialogComponent, {
            data,
            width: '20%',
        });
        dialogRef.disableClose = true;
        return dialogRef;
    }
}
