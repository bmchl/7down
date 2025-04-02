import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { of } from 'rxjs';
import { CustomDialogService } from './custom-dialog.service';
import { ReplayService } from './replay.service';

describe('ReplayService', () => {
    let service: ReplayService;
    const customDialogService = jasmine.createSpyObj('CustomDialogService', ['openDialog']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    let intervalSpy: jasmine.Spy;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [RouterTestingModule],
            providers: [
                { provide: CustomDialogService, useValue: customDialogService },
                { provide: RouterTestingModule, useValue: router },
            ],
        });
        service = TestBed.inject(ReplayService);
        service.events = [];
        intervalSpy = spyOn(window, 'setInterval').and.callThrough();
    });

    afterEach(() => {
        clearInterval(service.timerInterval);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
    it('getGameTime method should return math.floor', () => {
        service.gameTime = 1.2;
        expect(service.getGameTime()).toEqual(1);
    });

    it('getProgressTime method should return math.floor', () => {
        service.progressTime = 1.2;
        expect(service.getProgressTime()).toEqual(1);
    });
    it('logChat method should add an event', () => {
        const initialLength = service.events.length;
        service.logChat(0, 'test');
        expect(service.events.length).toEqual(initialLength + 1);
    });
    it('logGlobalMessage method should add an event', () => {
        const initialLength = service.events.length;
        service.logGlobalMessage('test');
        expect(service.events.length).toEqual(initialLength + 1);
    });
    it('logClick method should add an event', () => {
        const initialLength = service.events.length;
        service.logClick(0, { x: 0, y: 0 });
        expect(service.events.length).toEqual(initialLength + 1);
    });
    it('logError method should add an event', () => {
        const initialLength = service.events.length;
        service.logError(0, { x: 0, y: 0 });
        expect(service.events.length).toEqual(initialLength + 1);
    });
    it('logOtherError method should add an event', () => {
        const initialLength = service.events.length;
        service.logOtherError(0);
        expect(service.events.length).toEqual(initialLength + 1);
    });

    it('replayOrResume method should open an interval', () => {
        service.replayOrResume();
        expect(service.timerInterval).toBeDefined();
        expect(intervalSpy).toHaveBeenCalled();
    });

    it('replayOrResume should start the interval and call expected functions', (done) => {
        const intervalSpeed = 100;
        service.replaySpeedValue = 3;
        service.progressTime = 0;
        service.gameTime = 0.4;
        service.progressIndex = 0;
        service.interval = 100;
        const mockEvents = [
            { type: 'chat', timestamp: 0, player: 1, data: { value: 'hello' } },
            { type: 'globalMessage', timestamp: 0.4, player: 1, data: { value: 'hello' } },
            { type: 'click', timestamp: 0.1, player: 1, data: { x: 0, y: 0 } },
            { type: 'error', timestamp: 0.2, player: 1, data: { x: 0, y: 0 } },
            { type: 'otherError', timestamp: 0.3, player: 1, data: { x: 0, y: 0 } },
        ];

        const addChatMessageSpy = spyOn(service.localMessages, 'addChatMessage');
        const addSpy = spyOn(service.localMessages, 'add');
        const blinkEmitSpy = spyOn(service.blinkEmit, 'emit');
        const drawErrorSpy = spyOn(service.drawError, 'emit');
        const openEndDialogSpy = spyOn(service, 'openEndDialog');
        const pausespy = spyOn(service, 'pause');

        service.events = mockEvents;
        service.interval = intervalSpeed;
        service.replaySpeedValue = 1;
        service.progressIndex = 0;
        service.progressTime = 0;
        service.gameTime = 1;
        service.timeBuffer = 0.2;

        service.replayOrResume();
        setTimeout(() => {
            expect(intervalSpy).toHaveBeenCalled();
            expect(addChatMessageSpy).toHaveBeenCalled();
            expect(addSpy).toHaveBeenCalled();
            expect(blinkEmitSpy).toHaveBeenCalled();
            expect(drawErrorSpy).toHaveBeenCalled();
            expect(openEndDialogSpy).toHaveBeenCalled();
            expect(pausespy).toHaveBeenCalled();
            done();
        }, 1500);
    });
    it('openEndDialog method should open a dialog', () => {
        customDialogService.openDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<BasicDialogComponent, any>);
        service.openEndDialog();
        expect(customDialogService.openDialog).toHaveBeenCalled();
    });
    it('openEndDialog method should navigate if submit false', () => {
        customDialogService.openDialog.and.returnValue({
            afterClosed: () => of(false),
        } as MatDialogRef<BasicDialogComponent, any>);
        const resetspy = spyOn(service, 'reset');
        service.openEndDialog();
        expect(customDialogService.openDialog).toHaveBeenCalled();
        expect(service.isDisplaying).toBeFalse();
        expect(resetspy).toHaveBeenCalled();
    });

    it('replay should call replayOrResume', () => {
        const replayOrResumeSpy = spyOn(service, 'replayOrResume');
        service.replay();
        expect(replayOrResumeSpy).toHaveBeenCalled();
    });

    it('pause should call clearInterval and change isPause', () => {
        service.isPause = false;
        const clearIntervalSpy = spyOn(window, 'clearInterval');
        service.pause();
        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(service.isPause).toBeTrue();
    });

    it('resume should call replayOrResume and change isPause', () => {
        service.isPause = true;
        const replayOrResumeSpy = spyOn(service, 'replayOrResume');
        service.resume();
        expect(replayOrResumeSpy).toHaveBeenCalled();
        expect(service.isPause).toBeFalse();
    });

    it('toggleReplay should call pause if isPause is false', () => {
        service.isPause = false;
        const pauseSpy = spyOn(service, 'pause');
        service.toggleReplay();
        expect(pauseSpy).toHaveBeenCalled();
    });
    it('toggleReplay should call resume if isPause is true', () => {
        service.isPause = true;
        const resumespy = spyOn(service, 'resume');
        service.toggleReplay();
        expect(resumespy).toHaveBeenCalled();
    });

    it('setGameTime should set gameTime correctly', () => {
        service.setGameTime(1000);
        expect(service.gameTime).toEqual(1);
    });

    it('saveStartTime should set startTime correctly', () => {
        service.saveStartTime();
        expect(service.startGameTime).toBeDefined();
    });

    it('reset should set all properties to default', () => {
        service.reset();
        expect(service.progressTime).toEqual(0);
        expect(service.progressTime).toEqual(0);
    });

    it('ngOnDestroy should call clearInterval and set all properties to default', () => {
        const clearIntervalSpy = spyOn(window, 'clearInterval');
        service.ngOnDestroy();
        expect(clearIntervalSpy).toHaveBeenCalled();
        expect(service.progressTime).toEqual(0);
        expect(service.progressIndex).toEqual(0);
        expect(service.startGameTime).toEqual(0);
        expect(service.events).toEqual([]);
        expect(service.timerInterval).toEqual(null);
        expect(service.isPause).toEqual(false);
    });
});
