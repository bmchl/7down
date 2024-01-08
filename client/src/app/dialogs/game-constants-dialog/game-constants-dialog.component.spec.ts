import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppMaterialModule } from '@app/modules/material.module';
import { RequestService } from '@app/services/request.service';
import { of } from 'rxjs';

import { GameConstantsDialogComponent } from './game-constants-dialog.component';

describe('GameConstantsDialogComponent', () => {
    let component: GameConstantsDialogComponent;
    let requestService: RequestService;
    let fixture: ComponentFixture<GameConstantsDialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, AppMaterialModule, BrowserAnimationsModule, FormsModule, ReactiveFormsModule],
            declarations: [GameConstantsDialogComponent],
            providers: [RequestService, { provide: MatDialogRef, useValue: { close: jasmine.createSpy() } }],
        }).compileComponents();

        fixture = TestBed.createComponent(GameConstantsDialogComponent);
        component = fixture.componentInstance;
        requestService = TestBed.inject(RequestService);
        fixture.detectChanges();
    });

    it('should create', () => {
        spyOn(requestService, 'getRequest').and.returnValue(of({ initialTime: 30, penalty: 5, timeGainPerDiff: 5 }));
        component.ngOnInit();
        expect(component).toBeTruthy();
    });

    it('should save consts when valid', () => {
        Object.defineProperty(component.myForm, 'valid', { value: true });
        spyOn(requestService, 'putRequest').and.returnValue(of({}));
        component.saveConsts();
        expect(component).toBeTruthy();
    });

    it('should save consts when valid', () => {
        Object.defineProperty(component.myForm, 'valid', { value: true });
        spyOn(component.myForm, 'get').and.returnValue(null);
        spyOn(requestService, 'putRequest').and.returnValue(of({}));
        component.saveConsts();
        expect(component).toBeTruthy();
    });

    it('should not save consts when invalid', () => {
        Object.defineProperty(component.myForm, 'valid', { value: false });
        const spy = spyOn(requestService, 'putRequest');
        component.saveConsts();
        expect(spy).not.toHaveBeenCalled();
    });
});
