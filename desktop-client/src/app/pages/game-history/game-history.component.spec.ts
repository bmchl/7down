import { HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { HeaderComponent } from '@app/components/header/header.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { ErrorDialogComponent } from '@app/dialogs/error-dialog/error-dialog.component';
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { of } from 'rxjs';
import { GameHistoryComponent } from './game-history.component';

describe('GameHistoryComponent', () => {
    let component: GameHistoryComponent;
    let request: RequestService;
    let customDialogService: jasmine.SpyObj<CustomDialogService>;
    let fixture: ComponentFixture<GameHistoryComponent>;

    beforeEach(async () => {
        customDialogService = jasmine.createSpyObj('CustomDialogService', ['openErrorDialog', 'openInputDialog', 'openDialog']);
        customDialogService.openDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<BasicDialogComponent, any>);

        customDialogService.openInputDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<InputDialogComponent, any>);

        customDialogService.openErrorDialog.and.returnValue({
            afterClosed: () => of({}),
        } as MatDialogRef<ErrorDialogComponent, any>);

        await TestBed.configureTestingModule({
            imports: [AppMaterialModule, HttpClientTestingModule],
            declarations: [HeaderComponent, GameHistoryComponent, BasicDialogComponent, InputDialogComponent, ErrorDialogComponent],
            providers: [{ provide: CustomDialogService, useValue: customDialogService }],
        }).compileComponents();

        request = TestBed.inject(RequestService);
        fixture = TestBed.createComponent(GameHistoryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('ngOnInit should calculate correctly get History', () => {
        const fakeGames = [
            {
                id: '1',
                startDate: 1617913200000,
                multiplayer: true,
                completionTime: 90000,
                timeLimit: true,
            },
            {
                id: '2',
                startDate: 1617913200000,
                multiplayer: false,
                completionTime: 120000,
                timeLimit: false,
            },
            {
                id: '3',
                startDate: 1617913200000,
                multiplayer: true,
                completionTime: 150000,
                timeLimit: false,
            },
        ] as any;

        /* const expectedGames = [
            {
                id: '1',
                startDate: 1617913200000,
                multiplayer: true,
                completionTime: 90000,
                formattedStartDate: '8/4/2021',
                responseTime: '16:20:00',
                playerMode: 'Multi',
                gameTime: '01:30',
                gameMode: 'Classique',
            },
            {
                id: '2',
                startDate: 1617913200000,
                multiplayer: false,
                completionTime: 120000,
                formattedStartDate: '8/4/2021',
                responseTime: '16:20:00',
                playerMode: 'Solo',
                gameTime: '02:00',
                gameMode: 'Classique',
            },
            {
                id: '3',
                startDate: 1617913200000,
                multiplayer: true,
                completionTime: 150000,
                formattedStartDate: '8/4/2021',
                responseTime: '16:20:00',
                playerMode: 'Multi',
                gameTime: '02:30',
                gameMode: 'Temps limité',
            },
        ] as any;*/

        spyOn(request, 'getRequest').and.callFake(() => of(fakeGames));
        component.ngOnInit();
        expect(component.matches).toBeDefined();
    });

    it("deleteHistory should call requestService's deleteHistory", () => {
        component.matches = [
            {
                id: '',
                startDate: 0,
                multiplayer: false,
                completionTime: 0,
                formattedStartDate: '',
                responseTime: '',
                playerMode: '',
                gameTime: '',
                gameMode: '',
            },
        ] as any;

        const fakeResponse = new HttpResponse({ status: 200 }) as HttpResponse<object>;
        const spyRequest = spyOn(request, 'deleteRequest').and.returnValue(of(fakeResponse));

        component.deleteHistory();
        expect(spyRequest).toHaveBeenCalled();
    });

    it("deleteHistory should call requestService's deleteHistory", () => {
        component.matches = [
            {
                id: '',
                startDate: 0,
                multiplayer: false,
                completionTime: 0,
                formattedStartDate: '',
                responseTime: '',
                playerMode: '',
                gameTime: '',
                gameMode: '',
            },
        ] as any;

        const fakeResponse = { status: 200, deletedCount: 0 } as any;
        const spyRequest = spyOn(request, 'deleteRequest').and.returnValue(of(fakeResponse));

        component.deleteHistory();
        expect(spyRequest).toHaveBeenCalled();
    });
});
