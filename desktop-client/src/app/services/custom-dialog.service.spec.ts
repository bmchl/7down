import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import {
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
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { of } from 'rxjs';
import { CustomDialogService } from './custom-dialog.service';

describe('CustomDialogService', () => {
    let service: CustomDialogService;
    let matDialogOpenSpy: jasmine.Spy;
    let basicDialogData: CustomDialogData;
    let inputDialogData: CustomInputDialogData;
    let errorDialogData: CustomErrorDialogData;
    let imageDialogData: CustomImageDialogData;
    let waitlistDialogData: WaitlistDialogData;
    let timeLimitedDialogData: TimeLimitedDialogData;
    let loadingWithButtonDialogData: CustomLoadingWithButtonDialogComponent;
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [AppMaterialModule],
            declarations: [BasicDialogComponent, InputDialogComponent, DiffDialogComponent, ErrorDialogComponent],
        });
        service = TestBed.inject(CustomDialogService);
        matDialogOpenSpy = spyOn(service.dialog, 'open').and.returnValue({
            afterClosed: () => of(true),
        } as MatDialogRef<typeof service>);
        basicDialogData = {
            title: 'dialog title',
            confirm: 'yes',
            cancel: 'no',
            routerLink: '/home',
        };
        inputDialogData = {
            title: 'dialog title',
            confirm: 'yes',
            cancel: 'no',
            inputLabel: 'label',
            input: '',
        };
        loadingWithButtonDialogData = {
            title: 'dialog title',
        };
        errorDialogData = {
            title: 'dialog title',
            message: 'error message',
        };
        imageDialogData = {
            title: 'dialog title',
            img: [[[]]],
            differenceCount: 7,
        };
        waitlistDialogData = {
            joiners: [],
        };
        timeLimitedDialogData = {
            input: '',
            solo: undefined,
        };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('openDialog should call MatDialog.open()', () => {
        service.openDialog(basicDialogData);
        service.openInputDialog(inputDialogData);
        service.openErrorDialog(errorDialogData);
        service.openImageDialog(imageDialogData);
        service.openLoadingDialog('title');
        service.openConstantsDialog();
        service.openTimeLimitedDialog(timeLimitedDialogData);
        service.openLoadingWithButtonDialog(loadingWithButtonDialogData);
        service.openWaitlistDialog(waitlistDialogData);
        expect(matDialogOpenSpy).toHaveBeenCalledTimes(9);
    });
});
