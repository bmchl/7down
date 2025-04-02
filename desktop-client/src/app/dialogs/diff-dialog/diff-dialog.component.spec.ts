import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AppMaterialModule } from '@app/modules/material.module';
import { DrawService } from '@app/services/draw.service';
import { BasicDialogComponent } from './../basic-dialog/basic-dialog.component';
import { DiffDialogComponent } from './diff-dialog.component';

describe('DiffDialogComponent', () => {
    let component: DiffDialogComponent;
    let fixture: ComponentFixture<DiffDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppMaterialModule],
            declarations: [DiffDialogComponent, BasicDialogComponent],
            providers: [
                [DrawService],
                { provide: MatDialogRef, useValue: {} },
                { provide: MAT_DIALOG_DATA, useValue: { title: 'test', message: 'test' } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DiffDialogComponent);
        component = fixture.componentInstance;
        component.data = { img: [[[0, 0]]], title: '', differenceCount: 0 };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
