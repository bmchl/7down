import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CustomInputDialogData } from '@app/dialogs/custom-dialog-data';
import { AppMaterialModule } from '@app/modules/material.module';
import { BasicDialogComponent } from './../basic-dialog/basic-dialog.component';
import { InputDialogComponent } from './input-dialog.component';
describe('InputDialogComponent', () => {
    let component: InputDialogComponent;
    let fixture: ComponentFixture<InputDialogComponent>;
    let data: CustomInputDialogData;

    beforeEach(async () => {
        data = { title: '', inputLabel: '', confirm: '', cancel: '', input: '' };
        await TestBed.configureTestingModule({
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: data },
                { provide: MatDialogRef, useValue: {} },
            ],
            declarations: [InputDialogComponent, BasicDialogComponent],
            imports: [FormsModule, BrowserAnimationsModule, AppMaterialModule],
        }).compileComponents();

        fixture = TestBed.createComponent(InputDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
