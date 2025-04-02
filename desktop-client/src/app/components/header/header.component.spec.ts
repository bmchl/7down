import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';

import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppMaterialModule],
            declarations: [HeaderComponent, BasicDialogComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('backClicked() should redirect to the previous page using Location', () => {
        component.location.back = jasmine.createSpy();
        component.backClicked();
        expect(component.location.back).toHaveBeenCalled();
    });
});
