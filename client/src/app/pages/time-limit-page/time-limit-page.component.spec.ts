import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HeaderComponent } from '@app/components/header/header.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';

import { HttpClientModule } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { AppModule } from '@app/app.module';
import { DifferenceCountComponent } from '@app/components/difference-count/difference-count.component';
import { GameInfoComponent } from '@app/components/game-info/game-info.component';
import { HintsComponent } from '@app/components/hints/hints.component';
import { MessagesComponent } from '@app/components/messages/messages.component';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { StopwatchComponent } from '@app/components/stopwatch/stopwatch.component';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { GamePageComponent } from './../game-page/game-page.component';
import { MainPageComponent } from './../main-page/main-page.component';
import { TimeLimitPageComponent } from './time-limit-page.component';

describe('TimeLimitPageComponent', () => {
    let component: TimeLimitPageComponent;
    let fixture: ComponentFixture<TimeLimitPageComponent>;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;

    beforeEach(async () => {
        socketServiceSpy = jasmine.createSpyObj('SocketClientService', ['on', 'send', 'connect', 'off', 'removeAllListeners']);
        await TestBed.configureTestingModule({
            declarations: [
                TimeLimitPageComponent,
                BasicDialogComponent,
                GameInfoComponent,
                HeaderComponent,
                HintsComponent,
                GamePageComponent,
                MessagesComponent,
                PlayAreaComponent,
                StopwatchComponent,
                DifferenceCountComponent,
            ],
            imports: [
                AppMaterialModule,
                AppModule,
                HttpClientModule,
                RouterTestingModule.withRoutes([{ path: 'home', component: MainPageComponent }]),
                BrowserAnimationsModule,
            ],
            providers: [
                {
                    provide: ClassicGameLogicService,
                    useValue: jasmine.createSpyObj('ClassicGameLogicService', ['onUndefinedHero']),
                },
                { provide: MatDialog, useValue: {} },
                { provide: SocketClientService, useValue: socketServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TimeLimitPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('refresh should call abandonGame', () => {
        component.onWindowReload();
        expect(component.socketService.send).toHaveBeenCalledWith('abandon-game-tl');
    });

    it('handleRefresh should return false if this.hero !== this.defaultHero', () => {
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
            playerName1: '',
            playerName2: '',
            isOver: false,
        };
        expect(component.handleRefresh()).toBeFalse();
    });

    it('handleRefresh should return false if this.hero === this.defaultHero', () => {
        component.hero = component.defaultHero;
        expect(component.handleRefresh()).toBeTruthy();
    });

    it('timer end should open dialog', () => {
        spyOn(component.customDialogService, 'openDialog').and.callFake(jasmine.createSpy());
        component.timerEnd();
        expect(component.customDialogService.openDialog).toHaveBeenCalled();
    });

    it('ngOnInit', () => {
        component.ngOnInit();
        expect(socketServiceSpy.connect).toHaveBeenCalled();
    });

    it('random games callback', () => {
        component.ngOnInit();
        component.hero.isOver = true;
        const callback = socketServiceSpy.on.calls.argsFor(4)[1];
        callback({
            games: [
                {
                    image: 'aa',
                    image1: 'aa',
                    imageDifference: [],
                },
                {
                    image: 'aa',
                    image1: 'aa',
                    imageDifference: [],
                },
            ],
            constants: {
                initialTime: 30,
                penalty: 5,
                timeGainPerDiff: 5,
            },
            player0: '',
            player1: '',
        });
        expect(component.hero.isOver).toBeDefined();
    });

    it('random games callback with player 0 == playerName1', () => {
        spyOn(component, 'determineGameMode').and.callFake(jasmine.createSpy());
        component.hero.playerName1 = 'test';
        component.ngOnInit();
        component.hero.isOver = true;
        const callback = socketServiceSpy.on.calls.argsFor(4)[1];
        callback({
            games: [
                {
                    image: 'aa',
                    image1: 'aa',
                    imageDifference: [],
                },
                {
                    image: 'aa',
                    image1: 'aa',
                    imageDifference: [],
                },
            ],
            constants: {
                initialTime: 30,
                penalty: 5,
                timeGainPerDiff: 5,
            },
            player0: 'test',
            player1: '',
        });
        expect(component.hero.isOver).toBeFalsy();
    });

    it('player abandonned should set multi to false', () => {
        component.ngOnInit();
        component.hero.multiplayer = true;
        const callback = socketServiceSpy.on.calls.argsFor(5)[1];
        callback({});
        expect(component.hero.multiplayer).toBeFalsy();
    });

    it('refresh on nginit', () => {
        spyOn(window.localStorage, 'getItem').and.returnValue('true');
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        component['router'] = routerSpy;
        component.ngOnInit();
        expect(routerSpy.navigate).toHaveBeenCalled();
    });

    it('validate-coords-tl if error', () => {
        component.ngOnInit();
        component.hero.multiplayer = true;
        const callback = socketServiceSpy.on.calls.argsFor(6)[1];
        spyOn(component.drawService, 'drawError').and.callFake(jasmine.createSpy());
        callback({ res: -1 });
        expect(component.drawService.drawError).toHaveBeenCalled();
    });

    it('validate-coords-tl if difference', () => {
        spyOn(component, 'determineGameMode').and.callFake(jasmine.createSpy());
        component.isSolo = true;
        component.ngOnInit();
        const callbackRandom = socketServiceSpy.on.calls.argsFor(4)[1];
        callbackRandom({
            games: [
                {
                    image: 'aa',
                    image1: 'aa',
                    imageDifference: [],
                },
                {
                    image: 'aa',
                    image1: 'aa',
                    imageDifference: [],
                },
            ],
            constants: {
                initialTime: 30,
                penalty: 5,
                timeGainPerDiff: 5,
            },
            player0: '',
            player1: '',
        });
        const callback = socketServiceSpy.on.calls.argsFor(6)[1];
        spyOn(component.drawService, 'drawDifference').and.callFake(jasmine.createSpy());
        callback({ res: 1 });
        expect(component.drawService.drawDifference).toHaveBeenCalled();
    });

    it('validate-coords-tl if difference and gameEnded', () => {
        spyOn(component.customDialogService, 'openDialog').and.callFake(jasmine.createSpy());
        component.ngOnInit();
        const callback = socketServiceSpy.on.calls.argsFor(6)[1];
        spyOn(component.drawService, 'drawDifference').and.callFake(jasmine.createSpy());
        callback({ res: 1, gameEnded: true });
        expect(component.drawService.drawDifference).toHaveBeenCalled();
        expect(component.customDialogService.openDialog).toHaveBeenCalled();
    });
});
