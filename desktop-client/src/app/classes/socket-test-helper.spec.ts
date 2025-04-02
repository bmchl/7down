import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from './socket-test-helper';

describe('SocketTestHelper', () => {
    let socketTestHelper: SocketTestHelper;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            providers: [SocketTestHelper],
        });
        socketTestHelper = TestBed.inject(SocketTestHelper);
    });

    it('should be created', () => {
        expect(socketTestHelper).toBeTruthy();
    });

    it('disconnect should return void', () => {
        expect(socketTestHelper.disconnect()).toBeUndefined();
    });

    it('disconnect should return void', () => {
        expect(socketTestHelper.removeAllListeners()).toBeUndefined();
    });

    it('emit should return void', () => {
        expect(socketTestHelper.emit('helloWorld')).toBeUndefined();
    });

    it('on should add callback to event', () => {
        const callback = jasmine.createSpy('callback');
        socketTestHelper.on('event', callback);
        expect(socketTestHelper['callbacks'].get('event')).toContain(callback);
    });

    it('on should not add callback when the callback is null or undefined', () => {
        const event = 'test';
        const callback = jasmine.createSpy('callback');
        socketTestHelper['callbacks'].get = jasmine.createSpy().and.callFake(() => {
            return;
        });

        socketTestHelper.on(event, callback);

        expect(socketTestHelper['callbacks'].get('event')).not.toContain(callback);
    });

    it('off should add callback to event', () => {
        const callback = jasmine.createSpy('callback');
        socketTestHelper.off('event', callback);
        expect(socketTestHelper['callbacks'].get('event')).toContain(callback);
    });

    it('off should not add callback when the callback is null or undefined', () => {
        const event = 'test';
        const callback = jasmine.createSpy('callback');
        socketTestHelper['callbacks'].get = jasmine.createSpy().and.callFake(() => {
            return;
        });

        socketTestHelper.off(event, callback);

        expect(socketTestHelper['callbacks'].get('event')).not.toContain(callback);
    });

    it('peerSideEmit should call callback with params', () => {
        const callback = jasmine.createSpy('callback');
        socketTestHelper.on('event', callback);
        socketTestHelper.peerSideEmit('event', 'hello');
        expect(callback).toHaveBeenCalledWith('hello');
    });

    it('peerSideEmit should do nothing if no callback', () => {
        const event = 'event';
        const params = 'hello';
        const callback = jasmine.createSpy('callback');
        socketTestHelper.peerSideEmit(event, params);
        expect(callback).not.toHaveBeenCalled();
    });

    it('peerSideEmit should not call callback method if socketTestHelper.get() returns undefined', () => {
        const event = 'test';
        const params = 'hello';
        const callback = jasmine.createSpy('callback');
        socketTestHelper.on('event', callback);
        socketTestHelper['callbacks'].has = jasmine.createSpy().and.callFake(() => {
            return true;
        });
        socketTestHelper['callbacks'].get = jasmine.createSpy().and.callFake(() => {
            return undefined;
        });
        socketTestHelper.peerSideEmit(event, params);
        expect(callback).not.toHaveBeenCalled();
    });
});
