import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppMaterialModule } from '@app/modules/material.module';
import { TimeLimitedDialogComponent } from './time-limited-dialog.component';

describe('TimeLimitedDialogComponent', () => {
    let component: TimeLimitedDialogComponent;
    let fixture: ComponentFixture<TimeLimitedDialogComponent>;
    let dialogRef: jasmine.SpyObj<MatDialogRef<TimeLimitedDialogComponent>>;

    beforeEach(async () => {
        dialogRef = jasmine.createSpyObj('MatDialogRef<TimeLimitedDialogComponent>>', ['close']);
        await TestBed.configureTestingModule({
            declarations: [TimeLimitedDialogComponent],
            imports: [AppMaterialModule, BrowserAnimationsModule, FormsModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { input: '', solo: undefined } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TimeLimitedDialogComponent);
        component = fixture.componentInstance;
        component.data = { input: '', solo: false };

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should trigger start', () => {
        component.solo = true;
        component.triggerStart();
        expect(dialogRef.close).toHaveBeenCalled();
        expect(component.data.solo).toBeTrue();
    });
});
