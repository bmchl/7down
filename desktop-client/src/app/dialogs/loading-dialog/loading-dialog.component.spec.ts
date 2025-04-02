import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppMaterialModule } from '@app/modules/material.module';
import { BasicDialogComponent } from './../basic-dialog/basic-dialog.component';

import { LoadingDialogComponent } from './loading-dialog.component';

describe('LoadingDialogComponent', () => {
    let component: LoadingDialogComponent;
    let fixture: ComponentFixture<LoadingDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LoadingDialogComponent, BasicDialogComponent],
            providers: [{ provide: MAT_DIALOG_DATA, useValue: 'title' }],
            imports: [AppMaterialModule],
        }).compileComponents();

        fixture = TestBed.createComponent(LoadingDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
