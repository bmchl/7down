type CallbackSignature = (params: any) => void;
import { HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { ErrorDialogComponent } from '@app/dialogs/error-dialog/error-dialog.component';
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { of } from 'rxjs';
import { GameData } from './../game-data';
import { GameItemComponent } from './game-item.component';

describe('GameItemComponent', () => {
    let component: GameItemComponent;
    let fixture: ComponentFixture<GameItemComponent>;
    let request: RequestService;
    let classicGameLogicService: ClassicGameLogicService;
    let customDialogService: jasmine.SpyObj<CustomDialogService>;
    let socketClientService: jasmine.SpyObj<SocketClientService>;

    beforeEach(async () => {
        socketClientService = jasmine.createSpyObj('SocketClientService', ['send', 'on', 'connect']);
        customDialogService = jasmine.createSpyObj('CustomDialogService', [
            'openErrorDialog',
            'openLoadingDialog',
            'openInputDialog',
            'openImageDialog',
            'openDialog',
        ]);
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
            imports: [
                BrowserAnimationsModule,
                AppMaterialModule,
                BrowserAnimationsModule,
                FormsModule,
                HttpClientTestingModule,
                RouterTestingModule.withRoutes([{ path: 'game', component: GamePageComponent }]),
            ],
            declarations: [GameItemComponent, InputDialogComponent, BasicDialogComponent],
            providers: [
                { provide: CustomDialogService, useValue: customDialogService },
                { provide: SocketClientService, useValue: socketClientService },
                ClassicGameLogicService,
                RequestService,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(GameItemComponent);
        component = fixture.componentInstance;
        component.constants = { initialTime: 0, penalty: 5, timeGainPerDiff: '' };
        classicGameLogicService = TestBed.inject(ClassicGameLogicService);
        request = TestBed.inject(RequestService);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should update correctly gameService.hero with the game input', () => {
        component.game = {
            id: '1',
            gameName: '',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };

        const newGame: GameData = {
            id: component.game.id,
            name: component.game.gameName,
            mode: 'classique',
            difficulty: component.game.difficulty,
            multiplayer: false,
            penalty: component.constants.penalty,
            differenceCount: component.game.differenceCount,
            hintsUsed: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            startDate: 0,
            playerName1: '',
            playerName2: '',
        };

        component.createGame();

        expect(classicGameLogicService.hero).toEqual(newGame);
    });

    it("deleteGame should call requestService's deleteGame", () => {
        component.game = {
            id: '1',
            gameName: '',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };
        const fakeResponse = new HttpResponse({ status: 200 }) as HttpResponse<object>;
        const spyRequest = spyOn(request, 'deleteRequest').and.returnValue(of(fakeResponse));

        component.deleteGame();
        expect(spyRequest).toHaveBeenCalled();
    });

    it('deleteGame should call customDialogService openErrorDialog if delete method do not return 200', () => {
        component.game = {
            id: '1',
            gameName: '',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };
        const fakeResponse = new HttpResponse({ status: 404 }) as HttpResponse<object>;
        const spyRequest = spyOn(request, 'deleteRequest').and.returnValue(of(fakeResponse));

        component.deleteGame();
        expect(spyRequest).toHaveBeenCalled();
        expect(customDialogService.openErrorDialog).toHaveBeenCalled();
    });

    it('configureBaseSocketFeatures() should correctly update the game active state and toggle the button between create and join', () => {
        const data = { gameId: '1234', gameOn: true };
        component.game = {
            id: '1234',
            gameName: '',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };
        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'update-game-button') {
                callback(data);
            }
        });
        component.configureBaseSocketFeatures();
        expect(component.game.isGameOn).toEqual(data.gameOn);
    });

    it('createMultiGame should open an InputDialog, send a create-game event and correctly assign hero values', () => {
        component.game = {
            id: '1234',
            gameName: 'hello world',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };

        const expectedHero = {
            id: '1234',
            matchId: '',
            name: 'hello world',
            mode: 'classique',
            difficulty: 0,
            penalty: 0,
            differenceCount: 0,
            multiplayer: true,
            hintsUsed: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            startDate: 0,
            playerName1: '',
            playerName2: '',
            isHost: true,
        };
        component.createMultiGame();
        expect(customDialogService.openInputDialog).toHaveBeenCalled();
        expect(socketClientService.send).toHaveBeenCalledWith('create-game', { gameId: '1234', player0: '' });
        expect(component.gameService.hero).toEqual(expectedHero);
    });

    it('joinMultiGame should open an InputDialog, send a create-game event and correctly assign hero values', () => {
        component.game = {
            id: '1234',
            gameName: 'hello world',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };
        const expectedHero = {
            id: '1234',
            matchId: '',
            name: 'hello world',
            mode: 'classique',
            difficulty: 0,
            penalty: 0,
            differenceCount: 0,
            multiplayer: true,
            hintsUsed: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            startDate: 0,
            playerName1: '',
            playerName2: '',
            isHost: false,
        };
        component.joinMultiGame();
        expect(customDialogService.openInputDialog).toHaveBeenCalled();
        expect(socketClientService.send).toHaveBeenCalledWith('join-game', { gameId: '1234', player1: '' });
        expect(component.gameService.hero).toEqual(expectedHero);
    });

    it('resetTimes should call socket reset-scores', () => {
        component.game = {
            id: '1',
            gameName: '',
            image: '',
            image1: '',
            imageDifference: [[[0, 0, 0]]],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [{ name: 'name', time: 0 }],
            multiLeaderboard: [{ name: 'name', time: 0 }],
        };
        component.resetTimes();
        expect(socketClientService.send).toHaveBeenCalledWith('reset-scores', { gameId: '1' });
    });
});
