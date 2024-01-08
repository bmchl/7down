/* eslint-disable max-lines */
/* eslint-disable max-len */
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventEmitter } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { DiffDialogComponent } from '@app/dialogs/diff-dialog/diff-dialog.component';
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { Vec2 } from '@app/interfaces/vec2';
import { AppMaterialModule } from '@app/modules/material.module';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { DrawService } from '@app/services/draw.service';
import { MessageType } from '@app/services/game-message';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { of } from 'rxjs';
import { GameData, PlayerIndex } from './../game-data';

type CallbackSignature = (params?: any) => void;

describe('PlayAreaComponent', () => {
    let component: PlayAreaComponent;
    let drawService: DrawService;
    let fixture: ComponentFixture<PlayAreaComponent>;
    let mouseEvent: MouseEvent;
    let mockHero: GameData;
    let socketClientService: jasmine.SpyObj<SocketClientService>;
    let customDialogService: jasmine.SpyObj<CustomDialogService>;
    let replayService: ReplayService;
    let localMessages: jasmine.SpyObj<LocalMessagesService>;
    let fakeClose: jasmine.Spy;
    const ogImg =
        'data:image/bmp;base64,Qk2GAAAAAAAAADYAAAAoAAAABQAAAPv///8BABgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAA////////////////////AP///////////////////wD///////////////////8A////////////////////AP///////////////////wA=';
    const modImg =
        'data:image/bmp;base64,Qk2GAAAAAAAAADYAAAAoAAAABQAAAPv///8BABgAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////////AAAAAAAAAP///////////wD///////8AAAAAAAD///8A////AAAAAAAAAAAAAAAAAP///wAAAAAAAAAAAAAAAAA=';

    beforeEach(async () => {
        socketClientService = jasmine.createSpyObj('SocketClientService', ['send', 'on', 'connect', 'off']);
        customDialogService = jasmine.createSpyObj('CustomDialogService', [
            'openErrorDialog',
            'openLoadingDialog',
            'openInputDialog',
            'openImageDialog',
            'openDialog',
        ]);

        customDialogService.openInputDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<InputDialogComponent, any>);

        customDialogService.openDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<BasicDialogComponent, any>);

        customDialogService.openImageDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<DiffDialogComponent, any>);

        customDialogService.openLoadingDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
            close: () => fakeClose(),
        } as MatDialogRef<LoadingDialogComponent, any>);

        localMessages = jasmine.createSpyObj('LocalMessagesService', ['addMessage', 'reset']);
        await TestBed.configureTestingModule({
            declarations: [PlayAreaComponent, BasicDialogComponent],
            imports: [AppMaterialModule, HttpClientTestingModule, RouterTestingModule.withRoutes([{ path: '', component: MainPageComponent }])],
            providers: [
                { provide: SocketClientService, useValue: socketClientService },
                { provide: CustomDialogService, useValue: customDialogService },
                { provide: LocalMessagesService, useValue: localMessages },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        fixture = TestBed.createComponent(PlayAreaComponent);
        drawService = TestBed.inject(DrawService);
        replayService = TestBed.inject(ReplayService);
        mockHero = {
            id: '1',
            name: 'differences of the wild',
            difficulty: 5,
            penalty: 10,
            differenceCount: 7,
            mode: 'Classique',
            multiplayer: false,
            hintsUsed: 0,
            differencesFound1: 5,
            differencesFound2: 0,
            startDate: 0,
            playerName1: 'Link',
            playerName2: '',
        };

        component = fixture.componentInstance;
        component.images = ['a', 'b'];
        component.hero = mockHero;
        component.socketService.on = jasmine.createSpy();
        component.socketService.send = jasmine.createSpy();
        fakeClose = jasmine.createSpy();
        customDialogService.openLoadingDialog.and.returnValue({
            close: () => fakeClose(),
        } as MatDialogRef<LoadingDialogComponent, any>);
        component.getPlayerName = jasmine.createSpy().and.callFake((player: PlayerIndex) => {
            let result = '';
            switch (player) {
                case PlayerIndex.Player1: {
                    result = 'player1';
                    break;
                }
                case PlayerIndex.Player2: {
                    result = 'player2';
                    break;
                }
            }
            return result;
        });
        fixture.detectChanges();
    });

    afterEach(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should blink when blinkemit is sent', () => {
        spyOn(component, 'blinkDifference');
        const blinkEmit = new EventEmitter<any>();
        replayService.blinkEmit = blinkEmit;
        component.ngOnInit();
        blinkEmit.emit({ diff: [[]], speed: 2 });
        expect(component.blinkDifference).toHaveBeenCalled();
    });

    it('should change modified image src', () => {
        spyOn(component, 'blinkDifference');
        const resetImage = new EventEmitter<any>();
        replayService.resetImage = resetImage;
        component.modifiedImage.src = 'test';
        const serverPath = component.serverPath;
        component.ngOnInit();
        resetImage.emit({ diff: [[]], speed: 2 });
        expect(component.modifiedImage.src).toBe(serverPath + 'b/');
    });

    it('should draw erorr when drawerror form replay', () => {
        spyOn(drawService, 'drawError');
        const drawError = new EventEmitter<any>();
        replayService.drawError = drawError;
        component.ngOnInit();
        drawError.emit({ x: 1, y: 2 });
        expect(drawService.drawError).toHaveBeenCalled();
    });

    it('should return the quadrant width', () => {
        component.quadrantSize = { x: 50, y: 100 };
        expect(component.quadrantWidth).toEqual(50);
    });

    it('should return the quadrant height', () => {
        component.quadrantSize = { x: 50, y: 100 };
        expect(component.quadrantHeight).toEqual(100);
    });

    it('should return the subquadrant width', () => {
        component.subQuadrantSize = { x: 30, y: 60 };
        expect(component.subQuadrantWidth).toEqual(30);
    });

    it('should return the subquadrant height', () => {
        component.subQuadrantSize = { x: 30, y: 60 };
        expect(component.subQuadrantHeight).toEqual(60);
    });

    it('should toggle cheat mode when "t" key is pressed', () => {
        spyOn(component, 'cheatBlink').and.callFake(jasmine.createSpy());
        spyOn(component, 'toggleCheatMode').and.callFake(jasmine.createSpy());
        const event = new KeyboardEvent('keyup', { key: 't' });
        component.detectKeyPress(event);
        expect(component.toggleCheatMode).toHaveBeenCalled();
    });

    it('should toggle clue mode when "i" key is pressed', () => {
        spyOn(component, 'getClue');
        const event = new KeyboardEvent('keyup', { key: 'i' });
        component.detectKeyPress(event);
        expect(component.getClue).toHaveBeenCalled();
    });

    it('should not do anything when other keys are pressed', () => {
        spyOn(component, 'cheatBlink').and.callFake(jasmine.createSpy());
        spyOn(component, 'toggleCheatMode').and.callFake(jasmine.createSpy());
        spyOn(component, 'getClue');
        const event = new KeyboardEvent('keyup', { key: 'a' });
        component.detectKeyPress(event);
        expect(component.toggleCheatMode).not.toHaveBeenCalled();
        expect(component.getClue).not.toHaveBeenCalled();
    });

    it('should set isCheatMode to true and call cheatBlink functions', (done) => {
        spyOn(component, 'cheatBlink').and.callFake(jasmine.createSpy());
        component.toggleCheatMode();

        expect(component.isCheatMode).toBeTrue();
        expect(component.cheatBlink).toHaveBeenCalled();
        expect(component.cheatBlink).toHaveBeenCalled();
        setTimeout(() => done(), 4000);
    });

    it('should set isCheatMode to false when called twice', (done) => {
        spyOn(component, 'cheatBlink').and.callFake(jasmine.createSpy());
        component.toggleCheatMode();
        component.toggleCheatMode();

        expect(component.isCheatMode).toBeFalse();
        setTimeout(() => done(), 4000);
    });

    it('should toggle clue mode and call the appropriate function', () => {
        component.hero.multiplayer = false;

        drawService.context = {
            beginPath: jasmine.createSpy(),
            rect: jasmine.createSpy(),
            lineWidth: 0,
            strokeStyle: '',
            stroke: jasmine.createSpy(),
        } as any;
        spyOn(component, 'clueOneQuadrant');
        spyOn(component, 'clueTwoQuadrant');
        spyOn(component, 'clueThreeQuadrant');
        component.hero.hintsUsed = 0;

        component.getClue();
        expect(component.localMessages.addMessage).toHaveBeenCalledWith(MessageType.HintUsed, PlayerIndex.Player1);
        expect(component.hero.hintsUsed).toBe(1);
        expect(component.clueOneQuadrant).toHaveBeenCalled();
        expect(component.clueTwoQuadrant).not.toHaveBeenCalled();
        expect(component.clueThreeQuadrant).not.toHaveBeenCalled();

        component.getClue();
        expect(component.localMessages.addMessage).toHaveBeenCalledWith(MessageType.HintUsed, PlayerIndex.Player1);
        expect(component.hero.hintsUsed).toBe(2);
        expect(component.clueTwoQuadrant).toHaveBeenCalled();
        expect(component.clueThreeQuadrant).not.toHaveBeenCalled();

        component.getClue();
        expect(component.localMessages.addMessage).toHaveBeenCalledWith(MessageType.HintUsed, PlayerIndex.Player1);
        expect(component.hero.hintsUsed).toBe(3);
        expect(component.clueThreeQuadrant).toHaveBeenCalled();

        component.getClue();
        expect(component.hero.hintsUsed).toBe(3);
        expect(component.clueOneQuadrant).toHaveBeenCalledTimes(1);
        expect(component.clueTwoQuadrant).toHaveBeenCalledTimes(1);
        expect(component.clueThreeQuadrant).toHaveBeenCalledTimes(1);
    });

    it('mouseHitDetect should assign the mouse position to mousePosition variable', () => {
        const expectedPosition: Vec2 = { x: 100, y: 200 };
        mouseEvent = {
            offsetX: expectedPosition.x,
            offsetY: expectedPosition.y,
            button: 0,
        } as MouseEvent;
        component.mouseHitDetect(mouseEvent);
        expect(component.mousePosition).toEqual(expectedPosition);
    });

    /* eslint-disable @typescript-eslint/no-magic-numbers -- Add reason */
    it('mouseHitDetect should not change the mouse position if it is not a left click', () => {
        const expectedPosition: Vec2 = { x: 0, y: 0 };
        mouseEvent = {
            offsetX: expectedPosition.x + 10,
            offsetY: expectedPosition.y + 10,
            button: 1,
        } as MouseEvent;
        component.mouseHitDetect(mouseEvent);
        expect(component.mousePosition).not.toEqual({ x: mouseEvent.offsetX, y: mouseEvent.offsetY });
        expect(component.mousePosition).toEqual(expectedPosition);
    });

    it('ngAfterViewInit should put the left image in the left canvas and set images', async () => {
        component.serverPath = '';
        component.images = [ogImg, modImg];
        await component.ngOnChanges();
        expect(component.originalImage.src).toEqual(ogImg);
        expect(component.modifiedImage.src).toEqual(modImg);
        expect(component.originalImage.crossOrigin).toEqual('anonymous');
        expect(component.modifiedImage.crossOrigin).toEqual('anonymous');
        expect(component.originalImage.src).toEqual(ogImg);
        expect(component.modifiedImage.src).toEqual(modImg);
    });

    it('mouseHitDetect should iterate through the received array', () => {
        const expectedPosition: Vec2 = { x: 100, y: 200 };
        mouseEvent = {
            offsetX: expectedPosition.x,
            offsetY: expectedPosition.y,
            button: 0,
        } as MouseEvent;
        const uintc8 = new Uint8ClampedArray(3);
        uintc8[0] = 42;
        uintc8[1] = 43;
        uintc8[2] = 44;

        drawService.context = component.canvas0.nativeElement.getContext('2d') as CanvasRenderingContext2D;
        drawService.context1 = component.canvas1.nativeElement.getContext('2d') as CanvasRenderingContext2D;

        component.differences = [
            [
                [100, 200],
                [101, 200],
            ],
        ];
        component.incrementDifferences = jasmine.createSpy();
        spyOn(drawService.correctSound, 'play').and.callFake(async () => {
            jasmine.createSpy();
        });
        spyOn(drawService.context, 'getImageData').and.callFake(() => ({ colorSpace: 'srgb', height: 0, width: 0, data: uintc8 }));
        component.endHitDetect = jasmine.createSpy();
        component.isCheatMode = false;
        component.mouseHitDetect(mouseEvent);
        expect(component.mousePosition).toEqual(expectedPosition);
        expect(drawService.isWaiting).toBeTruthy();
    });

    it('mouseHitDetect send a validate coords request', async () => {
        const expectedPosition: Vec2 = { x: 100, y: 200 };
        mouseEvent = {
            offsetX: expectedPosition.x,
            offsetY: expectedPosition.y,
            button: 0,
        } as MouseEvent;
        drawService.context = component.canvas0.nativeElement.getContext('2d') as CanvasRenderingContext2D;
        drawService.context1 = component.canvas1.nativeElement.getContext('2d') as CanvasRenderingContext2D;
        component.mouseHitDetect(mouseEvent);
        expect(socketClientService.send).toHaveBeenCalled();
    });

    it('mouseHitDetect should return if this.error.show is true', () => {
        drawService.error.show = true;
        const expectedPosition: Vec2 = { x: 100, y: 200 };
        mouseEvent = {
            offsetX: expectedPosition.x,
            offsetY: expectedPosition.y,
            button: 0,
        } as MouseEvent;
        component.mouseHitDetect(mouseEvent);
        expect(component.mousePosition).not.toEqual(expectedPosition);
    });

    it('incrementDifferences() should increase differencesFound by 1 when it is less than differenceCount', () => {
        component.hero.differencesFound1 = 5;
        component.hero.differenceCount = 10;
        component.incrementDifferences(PlayerIndex.Player1);
        expect(component.hero.differencesFound1).toEqual(6);
    });

    it('incrementDifferences() should put isOver to true when it is equal to differenceCount', () => {
        component.hero.differencesFound1 = 10;
        component.hero.differenceCount = 10;
        component.hero.isOver = false;
        const data = { newRecord: 2 };

        customDialogService.openDialog.and.returnValue({
            afterClosed: () => of(false),
        } as MatDialogRef<BasicDialogComponent, any>);

        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'new-record') {
                callback(data);
            }
        });
        component.incrementDifferences(PlayerIndex.Player1);
        expect(component.hero.isOver).toEqual(true);
    });

    it('incrementDifferences() should increase differencesFound by 1 when it is less than differenceCount', () => {
        component.hero.differencesFound2 = 5;
        component.hero.differenceCount = 10;
        component.incrementDifferences(PlayerIndex.Player2);
        expect(component.hero.differencesFound2).toEqual(6);
    });

    it('getWinner() should return null if the game is not over ', () => {
        component.hero.isOver = false;
        expect(component.getWinner()).toEqual(null);
    });

    it('getWinner() should return the winner if the game is over and Player 1 wins in multiplayer mode', () => {
        component.hero.isOver = true;
        component.hero.multiplayer = true;
        component.hero.differencesFound1 = 6;
        component.hero.differencesFound2 = 4;
        component.hero.differenceCount = 10;
        expect(component.getWinner()).toEqual(component.getPlayerName(PlayerIndex.Player1));
    });

    it('getWinner() should return the winner if the game is over and Player 2 wins in multiplayer mode', () => {
        component.hero.isOver = true;
        component.hero.multiplayer = true;
        component.hero.differencesFound1 = 4;
        component.hero.differencesFound2 = 6;
        component.hero.differenceCount = 10;
        expect(component.getWinner()).toEqual(component.getPlayerName(PlayerIndex.Player2));
    });

    it('incrementDifferences() should put isOver to true when it is equal to differenceCount', () => {
        component.hero.differencesFound2 = 4;
        component.hero.differenceCount = 10;
        component.hero.isOver = false;
        component.hero.multiplayer = true;
        const data = { newRecord: 1 };
        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'new-record') {
                callback(data);
            }
        });
        component.incrementDifferences(PlayerIndex.Player2);
        expect(fakeClose).toHaveBeenCalled();
        expect(component.hero.isOver).toEqual(true);
    });

    it('should blink difference, increment differences, and add message on notify-difference-found event', () => {
        const data = { diff: { x: 10, y: 20 } };
        spyOn(component, 'blinkDifference');
        spyOn(component, 'incrementDifferences');

        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'notify-difference-found') {
                callback(data);
            }
        });
        component.handleDifferenceNotifications();

        expect(component.blinkDifference).toHaveBeenCalledWith(data.diff);
        expect(component.incrementDifferences).toHaveBeenCalledWith(PlayerIndex.Player2);
        expect(localMessages.addMessage).toHaveBeenCalledWith(MessageType.DifferenceFound, PlayerIndex.Player2);
    });

    it('should add error message on notify-difference-error event', () => {
        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'notify-difference-error') {
                callback();
            }
        });
        component.handleDifferenceNotifications();
        expect(localMessages.addMessage).toHaveBeenCalledWith(MessageType.Error, PlayerIndex.Player2);
    });

    it('should call endHitDetect if cheatmode is active when finding a diff', () => {
        component.isCheatMode = true;
        const spy = spyOn(component, 'endHitDetect').and.callFake(jasmine.createSpy());
        component.blinkDifference([]);
        expect(spy).toHaveBeenCalled();
    });

    it('endHitDetect should remove a diff from the differences array', () => {
        const dataArr = new Uint8ClampedArray();
        for (let i = 0; i < 480 * 640; i++) {
            dataArr[i] = i;
        }
        component.originalImageData = {
            data: dataArr,
            colorSpace: 'srgb',
            width: 640,
            height: 480,
        };
        component.diffImageData = {
            data: dataArr.reverse(),
            colorSpace: 'srgb',
            width: 640,
            height: 480,
        };

        component.differences = [
            [
                [1, 2],
                [3, 4],
            ],
        ];

        drawService.context1 = {
            fillRect: () => ({}),
            fillStyle: 'test',
        } as any;

        component.endHitDetect(0);
        expect(component.differences[0].length).toBe(2);
    });

    it('cheatBlink should call clearInterval when it is set to false', (done) => {
        const dataArr = new Uint8ClampedArray();
        for (let i = 0; i < 480 * 640; i++) {
            dataArr[i] = i;
        }
        component.originalImageData = {
            data: dataArr,
            colorSpace: 'srgb',
            width: 640,
            height: 480,
        };
        component.diffImageData = {
            data: dataArr.reverse(),
            colorSpace: 'srgb',
            width: 640,
            height: 480,
        };

        component.differences = [
            [
                [1, 2],
                [3, 4],
            ],
        ];

        const context1 = {
            fillRect: jasmine.createSpy(),
            fillStyle: 'test',
            putImageData: jasmine.createSpy(),
        } as any;

        const spy = spyOn(window, 'clearInterval');
        component.cheatBlink(component.originalImageData, component.diffImageData, context1);
        setTimeout(() => {
            component.isCheatMode = false;
            expect(spy).toHaveBeenCalled();
            done();
        }, 4000);
    });

    it('should return a valid random difference', () => {
        const differences = [
            [
                [0, 0],
                [1, 1],
                [2, 2],
            ],
            [
                [3, 3],
                [4, 4],
                [5, 5],
            ],
            [
                [6, 6],
                [7, 7],
                [8, 8],
            ],
        ];

        component.differences = differences;

        const result = component.clue();

        expect(differences).toContain(result);
    });

    it('should draw a rectangle on clueOneQuadrant()', () => {
        const randomDifferences = [
            [10, 20],
            [30, 40],
        ];
        spyOn(component, 'clue').and.returnValue(randomDifferences);
        drawService.context = {
            beginPath: jasmine.createSpy(),
            rect: jasmine.createSpy(),
            lineWidth: 0,
            strokeStyle: '',
            stroke: jasmine.createSpy(),
        } as any;
        component.clueOneQuadrant();

        expect(drawService.context.beginPath).toHaveBeenCalled();
        expect(drawService.context.rect).toHaveBeenCalledWith(0, 0, component.quadrantWidth, component.quadrantHeight);
        expect(drawService.context.lineWidth).toEqual(3);
        expect(drawService.context.strokeStyle).toEqual('yellow');
        expect(drawService.context.stroke).toHaveBeenCalled();
    });

    it('should draw rectangle with orange color in the correct sub-quadrant', () => {
        drawService.context = {
            beginPath: jasmine.createSpy(),
            rect: jasmine.createSpy(),
            lineWidth: 0,
            strokeStyle: '',
            stroke: jasmine.createSpy(),
        } as any;
        spyOn(component, 'clue').and.returnValue([[30, 40]]);
        component.clueTwoQuadrant();

        expect(drawService.context.beginPath).toHaveBeenCalled();
        expect(drawService.context.rect).toHaveBeenCalledWith(0, 0, 160, 120);
        expect(drawService.context.lineWidth).toBe(6);
        expect(drawService.context.strokeStyle).toBe('orange');
        expect(drawService.context.stroke).toHaveBeenCalled();
    });

    it('should draw an arrow in the correct sub-quadrant', () => {
        drawService.context = {
            beginPath: jasmine.createSpy(),
            rect: jasmine.createSpy(),
            lineWidth: 0,
            strokeStyle: '',
            stroke: jasmine.createSpy(),
            moveTo: jasmine.createSpy(),
            lineTo: jasmine.createSpy(),
            closePath: jasmine.createSpy(),
        } as any;
        spyOn(component, 'clue').and.returnValue([[25, 100]]);
        component.clueThreeQuadrant();

        expect(drawService.context.beginPath).toHaveBeenCalled();
        expect(drawService.context.moveTo).toHaveBeenCalledWith(25, 100);
        expect(drawService.context.lineTo).toHaveBeenCalledWith(15, 110);
        expect(drawService.context.lineTo).toHaveBeenCalledWith(35, 110);
        expect(drawService.context.lineTo).toHaveBeenCalledWith(25, 100);
        expect(drawService.context.closePath).toHaveBeenCalled();
        expect(drawService.context.lineWidth).toBe(6);
        expect(drawService.context.strokeStyle).toBe('red');
        expect(drawService.context.stroke).toHaveBeenCalled();
    });

    it('should not draw an arrow in other sub-quadrants', () => {
        drawService.context = {
            beginPath: jasmine.createSpy(),
            rect: jasmine.createSpy(),
            lineWidth: 0,
            strokeStyle: '',
            stroke: jasmine.createSpy(),
            moveTo: jasmine.createSpy(),
            lineTo: jasmine.createSpy(),
            closePath: jasmine.createSpy(),
        } as any;
        spyOn(component, 'clue').and.returnValue([[375, 350]]);
        component.clueThreeQuadrant();

        expect(drawService.context.strokeStyle).toBe('red');
    });
    it('should drawError when error on validateCoords', () => {
        const drawErrorSpy = spyOn(drawService, 'drawError').and.callFake(jasmine.createSpy());
        component.validateCoords({ res: -1, x: 0, y: 0 });
        expect(drawErrorSpy).toHaveBeenCalled();
    });

    it('should drawDifferences when found on validateCoords', (done) => {
        const expectedPosition: Vec2 = { x: 100, y: 200 };
        mouseEvent = {
            offsetX: expectedPosition.x,
            offsetY: expectedPosition.y,
            button: 0,
        } as MouseEvent;
        const uintc8 = new Uint8ClampedArray(3);
        uintc8[0] = 42;
        uintc8[1] = 43;
        uintc8[2] = 44;

        drawService.context = component.canvas0.nativeElement.getContext('2d') as CanvasRenderingContext2D;
        drawService.context1 = component.canvas1.nativeElement.getContext('2d') as CanvasRenderingContext2D;

        component.differences = [
            [
                [100, 200],
                [101, 200],
            ],
        ];
        component.incrementDifferences = jasmine.createSpy();
        spyOn(drawService.correctSound, 'play').and.callFake(async () => {
            jasmine.createSpy();
        });
        spyOn(drawService.context, 'getImageData').and.callFake(() => ({ colorSpace: 'srgb', height: 0, width: 0, data: uintc8 }));
        component.isCheatMode = false;
        const drawDifferenceSpy = spyOn(drawService, 'drawDifference').and.callFake(jasmine.createSpy());
        spyOn(component, 'endHitDetect').and.callFake(jasmine.createSpy());
        component.validateCoords({ res: 0, x: 0, y: 0 });
        expect(drawDifferenceSpy).toHaveBeenCalled();
        setTimeout(() => {
            done();
        }, 4000);
    });
});
