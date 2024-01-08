import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { AppMaterialModule } from '@app/modules/material.module';
import { BasicDialogComponent } from './basic-dialog.component';

describe('BasicDialogComponent', () => {
    let component: BasicDialogComponent;
    let fixture: ComponentFixture<BasicDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppMaterialModule, RouterTestingModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { title: '', routerLink: '', cancel: '', confirmQuit: '' } },
                { provide: MatDialogRef, useValue: {} },
            ],
            declarations: [BasicDialogComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(BasicDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
