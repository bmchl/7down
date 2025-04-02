import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppMaterialModule } from '@app/modules/material.module';

import { LoadingWithButtonDialogComponent } from './loading-with-button-dialog.component';

describe('LoadingWithButtonDialogComponent', () => {
    let component: LoadingWithButtonDialogComponent;
    let fixture: ComponentFixture<LoadingWithButtonDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LoadingWithButtonDialogComponent],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: 'title' },
                { provide: MatDialogRef, useValue: {} },
            ],
            imports: [AppMaterialModule],
        }).compileComponents();

        fixture = TestBed.createComponent(LoadingWithButtonDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
