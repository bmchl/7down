import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { TimeLimitedDialogComponent } from '@app/dialogs/time-limited-dialog/time-limited-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { of } from 'rxjs';
import { TimeLimitPageComponent } from './../time-limit-page/time-limit-page.component';
type CallbackSignature = (params?: any) => void;

describe('MainPageComponent', () => {
    let component: MainPageComponent;
    let fixture: ComponentFixture<MainPageComponent>;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;
    let customDialogServiceSpy: jasmine.SpyObj<CustomDialogService>;
    beforeEach(async () => {
        socketServiceSpy = jasmine.createSpyObj('SocketClientService', ['on', 'send', 'connect', 'off', 'removeAllListeners']);
        customDialogServiceSpy = jasmine.createSpyObj('CustomDialogService', ['openTimeLimitedDialog', 'openLoadingDialog']);
        customDialogServiceSpy.openTimeLimitedDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<TimeLimitedDialogComponent, any>);

        await TestBed.configureTestingModule({
            imports: [
                RouterTestingModule,
                HttpClientModule,
                AppMaterialModule,
                BrowserAnimationsModule,
                RouterTestingModule.withRoutes([{ path: 'time-limit', component: TimeLimitPageComponent }]),
            ],
            declarations: [MainPageComponent, BasicDialogComponent],
            providers: [
                { provide: SocketClientService, useValue: socketServiceSpy },
                { provide: CustomDialogService, useValue: customDialogServiceSpy },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(MainPageComponent);
        component = fixture.componentInstance;
        component.data = { solo: undefined, input: '' };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it("should have as title '7 DOWN'", () => {
        expect(component.title).toEqual('7 DOWN');
    });

    it('onTimeLimitedClick() should open a dialog', () => {
        component.data.solo = false;
        component.onTimeLimitedClick();
        expect(component.customDialogService.openTimeLimitedDialog).toHaveBeenCalled();
    });

    it('onTimeLimitedClick() should open a dialog', () => {
        component.data.solo = true;
        component.onTimeLimitedClick();
        expect(component.customDialogService.openTimeLimitedDialog).toHaveBeenCalled();
    });

    it('onTimeLimitedClick() should open a dialog', () => {
        component.onTimeLimitedClick();
        expect(component.customDialogService.openTimeLimitedDialog).toHaveBeenCalled();
    });

    it('should close the loading dialog when a time limited game is started', () => {
        socketServiceSpy.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'game-filled-tl') {
                callback();
            }
        });
        component.loadingDialogRef = jasmine.createSpyObj('MatDialogRef<LoadingDialogComponent>', ['close']);
        component.ngOnInit();
        expect(component.loadingDialogRef.close).toHaveBeenCalled();
    });
});
