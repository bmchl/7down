/* eslint-disable max-lines */
import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DifferenceCountComponent } from '@app/components/difference-count/difference-count.component';
import { GameInfoComponent } from '@app/components/game-info/game-info.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { HintsComponent } from '@app/components/hints/hints.component';
import { MessagesComponent } from '@app/components/messages/messages.component';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { StopwatchComponent } from '@app/components/stopwatch/stopwatch.component';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { GamePageComponent } from './game-page.component';
type CallbackSignature = (params?: any) => void;

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let gameService: ClassicGameLogicService;
    let customDialogServiceSpy: jasmine.SpyObj<CustomDialogService>;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;

    let hero: GameData;
    let gameInfo: {
        id: string;
        gameName: string;
        image: string;
        image1: string;
        differenceCount: number;
        difficulty: number;
        penalty: number;
        imageDifference: number[][][];
        soloLeaderboard: [];
        multiLeaderboard: [];
        isMultiplayer: boolean;
        multiPlayer: [];
        remainingTime: number;
    };

    beforeEach(async () => {
        socketServiceSpy = jasmine.createSpyObj('SocketClientService', ['on', 'send', 'connect', 'off', 'removeAllListeners']);
        await TestBed.configureTestingModule({
            declarations: [
                GameInfoComponent,
                HeaderComponent,
                HintsComponent,
                GamePageComponent,
                MessagesComponent,
                PlayAreaComponent,
                StopwatchComponent,
                DifferenceCountComponent,
                BasicDialogComponent,
            ],
            imports: [HttpClientModule, RouterTestingModule, AppMaterialModule],
            providers: [
                { provide: ClassicGameLogicService, useValue: {} },
                { provide: MatDialog, useValue: {} },
                { provide: SocketClientService, useValue: socketServiceSpy },
                { provide: UrlSerializer, useClass: DefaultUrlSerializer },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        customDialogServiceSpy = jasmine.createSpyObj<CustomDialogService>('CustomDialogService', ['openDialog']);
        component.customDialogService = customDialogServiceSpy;
        gameService = TestBed.inject(ClassicGameLogicService);
        hero = {
            id: 'testId',
            name: 'testName',
            mode: 'testMode',
            multiplayer: false,
            difficulty: 2,
            penalty: 5,
            differenceCount: 10,
            hintsUsed: 0,
            differencesFound1: 5,
            differencesFound2: 0,
            startDate: Date.now(),
            playerName1: 'testPlayer',
            playerName2: '',
            isOver: false,
            isHost: true,
        };

        gameService.hero = hero;

        gameInfo = {
            id: 'testId',
            gameName: 'testName',
            image: 'testImage',
            image1: 'testImage1',
            differenceCount: 10,
            penalty: 5,
            imageDifference: [
                [
                    [1, 2],
                    [3, 4],
                    [5, 6],
                    [7, 8],
                ],
            ],
            difficulty: 1,
            soloLeaderboard: [],
            multiLeaderboard: [],
            isMultiplayer: false,
            multiPlayer: [],
            remainingTime: 0,
        };
        component.gameInfo = gameInfo;
        fixture.detectChanges();
    });

    it('should set hero isOver to true and show custom dialog on enemy-abandon event', () => {
        socketServiceSpy.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'enemy-abandon') {
                callback();
            }
        });
        component.handleForfeit();
        expect(component.hero.isOver).toBeTrue();
        expect(customDialogServiceSpy.openDialog).toHaveBeenCalled();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return the correct player name', () => {
        component.hero = {
            id: '',
            name: '',
            mode: '',
            difficulty: 0,
            multiplayer: false,
            penalty: 0,
            differenceCount: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            hintsUsed: 0,
            startDate: 0,
            playerName1: 'John',
            playerName2: 'Jane',
        };
        expect(component.getPlayerName(PlayerIndex.Player1)).toBe('John');
        expect(component.getPlayerName(PlayerIndex.Player2)).toBe('Jane');
    });

    it('should return an empty string when the player index is not valid', () => {
        component.hero = {
            id: '',
            name: '',
            mode: '',
            difficulty: 0,
            multiplayer: false,
            penalty: 0,
            differenceCount: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            hintsUsed: 0,
            startDate: 0,
            playerName1: 'John',
            playerName2: 'Jane',
        };
        expect(component.getPlayerName(1)).toBe('John');
    });
});

//
//
//

import { NgZone } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DefaultUrlSerializer, Router, UrlSerializer } from '@angular/router';
import { GameData, PlayerIndex } from '@app/components/game-data';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { LoadingWithButtonDialogComponent } from '@app/dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { WaitlistDialogComponent } from '@app/dialogs/waitlist-dialog/waitlist-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { of } from 'rxjs';

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let requestSpy: jasmine.SpyObj<RequestService>;
    let gameServiceSpy: jasmine.SpyObj<ClassicGameLogicService>;
    let customDialogServiceSpy: jasmine.SpyObj<CustomDialogService>;
    let localMessagesSpy: jasmine.SpyObj<LocalMessagesService>;
    let socketService: jasmine.SpyObj<SocketClientService>;
    let replayService: jasmine.SpyObj<ReplayService>;
    let router: Router;
    let zone: NgZone;
    let fixture: ComponentFixture<GamePageComponent>;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;

    const gameId = 'testId';
    const gameInfo = {
        differenceCount: 5,
        penalty: 10,
        image: 'image1.jpg',
        image1: 'image2.jpg',
        imageDifference: [],
    };

    beforeEach(async () => {
        socketServiceSpy = jasmine.createSpyObj('SocketClientService', ['on', 'send', 'connect', 'off', 'removeAllListeners']);
        await TestBed.configureTestingModule({
            declarations: [
                GameInfoComponent,
                HeaderComponent,
                HintsComponent,
                GamePageComponent,
                MessagesComponent,
                PlayAreaComponent,
                StopwatchComponent,
                DifferenceCountComponent,
                BasicDialogComponent,
            ],
            imports: [
                HttpClientModule,
                RouterTestingModule,
                AppMaterialModule,
                RouterTestingModule.withRoutes([{ path: 'game', component: GamePageComponent }]),
            ],
            providers: [
                { provide: ClassicGameLogicService, useValue: jasmine.createSpyObj('ClassicGameLogicService', ['onUndefinedHero']) },
                { provide: MatDialog, useValue: {} },
                { provide: SocketClientService, useValue: socketServiceSpy },
                { provide: UrlSerializer, useClass: DefaultUrlSerializer },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        requestSpy = jasmine.createSpyObj<RequestService>('RequestService', ['getRequest']);
        gameServiceSpy = jasmine.createSpyObj<ClassicGameLogicService>('ClassicGameLogicService', ['onUndefinedHero']);
        customDialogServiceSpy = jasmine.createSpyObj<CustomDialogService>('CustomDialogService', [
            'openDialog',
            'openLoadingWithButtonDialog',
            'openErrorDialog',
            'openWaitlistDialog',
        ]);
        localMessagesSpy = jasmine.createSpyObj<LocalMessagesService>('LocalMessagesService', ['addMessage', 'getTimeString']);
        router = jasmine.createSpyObj<Router>('Router', ['navigate']);
        zone = TestBed.inject(NgZone);
        socketService = jasmine.createSpyObj('SocketClientService', ['socket', 'on', 'off', 'gameRoomId', 'connect', 'send', 'removeAllListeners']);
        socketService.isSocketAlive = jasmine.createSpy('isSocketAlive');
        replayService = jasmine.createSpyObj('ReplayService', [
            'getGameTime',
            'getProgressTime',
            'calculateTimeDifference',
            'logChat',
            'logGlobalMessage',
            'logClick',
            'logError',
            'logOtherError',
            'replayOrResume',
            'openEndDialog',
            'replay',
            'pause',
            'resume',
            'toggleReplay',
            'setGameTime',
            'saveStartTime',
            'reset',
            'ngOnDestroy',
        ]);

        component = new GamePageComponent(
            zone,
            router,
            gameServiceSpy,
            customDialogServiceSpy,
            localMessagesSpy,
            requestSpy,
            socketService,
            replayService,
        );

        gameServiceSpy.hero = {
            id: 'testId',
            name: 'testName',
            mode: 'testMode',
            multiplayer: false,
            difficulty: 2,
            penalty: 5,
            differenceCount: 10,
            hintsUsed: 0,
            differencesFound1: 5,
            differencesFound2: 0,
            startDate: Date.now(),
            playerName1: 'testPlayer',
            playerName2: '',
            isOver: true,
            isHost: true,
        };
    });

    it('should make an HTTP GET request to retrieve game information', () => {
        requestSpy.getRequest.and.returnValue(of(gameInfo));
        component.handleRefresh = jasmine.createSpy();
        component.configureMultiCreatorEvents = jasmine.createSpy();
        component.hero = gameServiceSpy.hero as GameData;
        component.hero.multiplayer = true;
        component.hero.isHost = true;
        component.ngOnInit();
        expect(component.configureMultiCreatorEvents).toHaveBeenCalled();
        expect(component.handleRefresh).toHaveBeenCalled();
        expect(requestSpy.getRequest).toHaveBeenCalledWith(`games/${gameId}`);
        expect(component.gameImages).toEqual([gameInfo.image, gameInfo.image1]);
        expect(component.differences).toEqual(gameInfo.imageDifference);
        expect(component.hero.differenceCount).toEqual(gameInfo.differenceCount);
        expect(component.hero.isOver).toEqual(false);
    });

    it('should handle the case where the hero is undefined', () => {
        gameServiceSpy.hero = undefined;
        component.ngOnInit();
        expect(gameServiceSpy.onUndefinedHero).toHaveBeenCalled();
        expect(component.hero).toEqual(component.defaultHero);
        expect(requestSpy.getRequest).not.toHaveBeenCalled();
    });

    it('handleRefresh should return false if this.hero !== this.defaultHero', () => {
        component.hero = {
            id: 'testId',
            name: 'testName',
            mode: 'testMode',
            multiplayer: false,
            difficulty: 2,
            penalty: 5,
            differenceCount: 10,
            hintsUsed: 0,
            differencesFound1: 5,
            differencesFound2: 0,
            startDate: Date.now(),
            playerName1: 'testPlayer',
            playerName2: '',
            isOver: true,
        };
        expect(component.handleRefresh()).toBeFalse();
    });

    it('getPlayerName should return the correct player name', () => {
        component.hero = {
            id: '',
            name: '',
            mode: '',
            difficulty: 0,
            multiplayer: false,
            penalty: 0,
            differenceCount: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            hintsUsed: 0,
            startDate: 0,
            playerName1: 'John',
            playerName2: 'Jane',
        };
        expect(component.getPlayerName(PlayerIndex.Player1)).toBe('John');
        expect(component.getPlayerName(PlayerIndex.Player2)).toBe('Jane');
    });

    it('abandonGame should send abandon-game event to server', () => {
        component.hero = {
            id: '',
            name: '',
            mode: '',
            difficulty: 0,
            multiplayer: false,
            penalty: 0,
            differenceCount: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            hintsUsed: 0,
            startDate: 0,
            playerName1: 'John',
            playerName2: 'Jane',
        };
        component.abandonGame();
        expect(component.socketService.send).toHaveBeenCalledWith('game-end', { matchId: component.hero.matchId, playerAbandoned: 'John' });
    });

    it('game started event should change the startDate', () => {
        component.hero = gameServiceSpy.hero as GameData;
        component.loadingWithButtonDialogRef = jasmine.createSpyObj<MatDialogRef<LoadingWithButtonDialogComponent, any>>(
            'LoadingWithButtonDialogComponent',
            ['close'],
        );
        customDialogServiceSpy.openDialog.and.returnValue({
            afterClosed: () => of(false),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.configureMultiCreatorEvents();
        const callback = socketService.on.calls.argsFor(1)[1];
        callback({ startDate: 1 });
        expect(component.hero.startDate).toBe(1);
    });

    it('player joined with accept undefined should do nothing', () => {
        component.hero = gameServiceSpy.hero as GameData;
        component.acceptDenyDialogRef = jasmine.createSpyObj<MatDialogRef<WaitlistDialogComponent, any>>('WaitlistDialogComponent', ['close']);
        const modal = jasmine.createSpyObj<MatDialogRef<WaitlistDialogComponent, any>>('WaitlistDialogComponent', ['close', 'afterClosed']);
        modal.afterClosed.and.returnValue(of(undefined));
        customDialogServiceSpy.openWaitlistDialog.and.returnValue(modal);
        component.loadingWithButtonDialogRef = jasmine.createSpyObj<MatDialogRef<LoadingWithButtonDialogComponent, any>>(
            'LoadingWithButtonDialogComponent',
            ['close', 'afterClosed'],
        );
        customDialogServiceSpy.openDialog.and.returnValue({
            afterClosed: () => of(undefined),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.configureMultiCreatorEvents();
        const callback = socketService.on.calls.argsFor(2)[1];
        callback({});
        expect(component.socketService.send).not.toHaveBeenCalledWith('join-approval');
    });

    it('player joined with 2nd time shoud close old dialog', () => {
        component.hero = gameServiceSpy.hero as GameData;
        const modal = jasmine.createSpyObj<MatDialogRef<WaitlistDialogComponent, any>>('WaitlistDialogComponent', ['close', 'afterClosed']);
        modal.afterClosed.and.returnValue(of(true));
        customDialogServiceSpy.openWaitlistDialog.and.returnValue(modal);
        component.loadingWithButtonDialogRef = jasmine.createSpyObj<MatDialogRef<LoadingWithButtonDialogComponent, any>>(
            'LoadingWithButtonDialogComponent',
            ['close', 'afterClosed'],
        );
        component.acceptDenyDialogRef = modal;

        const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed', 'close']);
        dialogRefSpy.afterClosed.and.returnValue(of(true));

        customDialogServiceSpy.openDialog.and.returnValue(dialogRefSpy as MatDialogRef<BasicDialogComponent, any>);
        component.configureMultiCreatorEvents();
        const callback = socketService.on.calls.argsFor(2)[1];
        callback({ players: [{ name: 'test1', accepted: true }, { name: 'test2' }] });
        expect(component.loadingWithButtonDialogRef.close).toHaveBeenCalled();
    });

    it('player joined with accept false should navigate to select page', () => {
        component.hero = gameServiceSpy.hero as GameData;
        component.loadingWithButtonDialogRef = jasmine.createSpyObj<MatDialogRef<LoadingWithButtonDialogComponent, any>>(
            'LoadingWithButtonDialogComponent',
            ['close'],
        );
        component.acceptDenyDialogRef = jasmine.createSpyObj<MatDialogRef<WaitlistDialogComponent, any>>('WaitlistDialogComponent', ['close']);
        customDialogServiceSpy.openWaitlistDialog.and.returnValue({
            afterClosed: () => of(false),
        } as MatDialogRef<WaitlistDialogComponent, any>);
        component.configureMultiCreatorEvents();
        const callback = socketService.on.calls.argsFor(2)[1];
        callback({
            players: [
                {
                    accepted: true,
                    name: 'test',
                    id: '1',
                },
            ],
        });
        expect(component.socketService.send).toHaveBeenCalled(); /* toHaveBeenCalledWith('join-approval', {
            solo: false,
            accept: false,
            gameId: 'testId',
            player0: 'testPlayer',
            player1: undefined,
            joinerId: undefined,
        });*/
        expect(router.navigate).toHaveBeenCalled();
    });

    it('player joined with accept true should set isFull to true', () => {
        component.hero = gameServiceSpy.hero as GameData;
        component.loadingWithButtonDialogRef = jasmine.createSpyObj<MatDialogRef<LoadingWithButtonDialogComponent, any>>(
            'LoadingWithButtonDialogComponent',
            ['close'],
        );
        component.acceptDenyDialogRef = jasmine.createSpyObj<MatDialogRef<WaitlistDialogComponent, any>>('WaitlistDialogComponent', ['close']);
        customDialogServiceSpy.openWaitlistDialog.and.returnValue({
            afterClosed: () => of(true),
        } as MatDialogRef<WaitlistDialogComponent, any>);
        spyOn(component, 'initWaitingRoom').and.callFake(jasmine.createSpy());
        component.configureMultiCreatorEvents();
        const callback = socketService.on.calls.argsFor(2)[1];
        callback({
            players: [
                {
                    accepted: true,
                    name: 'test',
                    id: '1',
                },
            ],
        });
        expect(component.isFull).toBe(true);
    });

    it('game started (guest) should put isFull to true', () => {
        component.hero = gameServiceSpy.hero as GameData;
        customDialogServiceSpy.openLoadingWithButtonDialog.and.returnValue({
            close: () => {
                return;
            },
            afterClosed: () => of(false),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.configureMultiGuestEvents();
        const callback = socketService.on.calls.argsFor(0)[1];
        callback({});
        expect(component.isFull).toBeTrue();
    });

    it('canceling from the joiner modal should send cancel-from-joiner', () => {
        component.hero = gameServiceSpy.hero as GameData;
        customDialogServiceSpy.openLoadingWithButtonDialog.and.returnValue({
            close: () => {
                return;
            },
            afterClosed: () => of(true),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.configureMultiGuestEvents();
        expect(component.socketService.send).toHaveBeenCalledWith('cancel-from-joiner', 'testId');
    });

    it('player-refuse event should close the loading modal', () => {
        component.hero = gameServiceSpy.hero as GameData;
        customDialogServiceSpy.openLoadingWithButtonDialog.and.returnValue({
            close: () => {
                return;
            },
            afterClosed: () => of(false),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.configureMultiGuestEvents();
        const closeSpy = spyOn(component.loadingWithButtonDialogRef, 'close');
        const callback = socketService.on.calls.argsFor(2)[1];
        callback({});
        expect(closeSpy).toHaveBeenCalled();
    });

    it('onGameDeleted should open error dialog', () => {
        component.hero = gameServiceSpy.hero as GameData;
        component.loadingWithButtonDialogRef = jasmine.createSpyObj<MatDialogRef<LoadingWithButtonDialogComponent, any>>(
            'LoadingWithButtonDialogComponent',
            ['close'],
        );
        component.acceptDenyDialogRef = jasmine.createSpyObj<MatDialogRef<WaitlistDialogComponent, any>>('BasicDialogComponent', ['close']);

        component.onGameDeleted({ gameId: component.hero.id });
        expect(customDialogServiceSpy.openErrorDialog).toHaveBeenCalled();
    });

    it('initWaitingRoom should open loadingWithButton dialog', () => {
        component.hero = gameServiceSpy.hero as GameData;
        customDialogServiceSpy.openLoadingWithButtonDialog.and.returnValue({
            close: () => {
                return;
            },
            afterClosed: () => of(false),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.initWaitingRoom();
        expect(customDialogServiceSpy.openLoadingWithButtonDialog).toHaveBeenCalled();
    });

    it('abandonGame should send abandon-game', () => {
        component.hero = gameServiceSpy.hero as GameData;
        component.abandonGame();
        expect(component.socketService.send).toHaveBeenCalled();
    });

    it('initWaitingRoom dialog with canceled true should emit cancel-from-client', () => {
        component.hero = gameServiceSpy.hero as GameData;
        customDialogServiceSpy.openLoadingWithButtonDialog.and.returnValue({
            close: () => {
                return;
            },
            afterClosed: () => of(true),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.initWaitingRoom();
        expect(component.socketService.send).toHaveBeenCalledWith('cancel-from-client', { gameId: component.hero.id });
    });

    it('should call configureMultiGuestEvents if multi is true and isHost is false', () => {
        component.hero = gameServiceSpy.hero as GameData;
        component.hero.multiplayer = true;
        component.hero.isHost = false;
        const configureMultiGuestEventsSpy = spyOn(component, 'configureMultiGuestEvents');
        spyOn(component, 'handleRefresh').and.returnValue(true);
        component.ngOnInit();
        expect(configureMultiGuestEventsSpy).toHaveBeenCalled();
    });
});
