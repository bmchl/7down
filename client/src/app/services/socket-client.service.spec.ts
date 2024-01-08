import { TestBed } from '@angular/core/testing';
import { SocketTestHelper } from './../classes/socket-test-helper';
import { SocketClientService } from './socket-client.service';
type CallbackSignature = (params?: any) => void;

describe('SocketClientService', () => {
    let service: SocketClientService;
    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(SocketClientService);
        service.socket = new SocketTestHelper() as any;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should disconnect', () => {
        const spy = spyOn(service.socket, 'disconnect');
        service.disconnect();
        expect(spy).toHaveBeenCalled();
    });

    it('isSocketAlive should return true if the socket is still connected', () => {
        service.socket.connected = true;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeTruthy();
    });

    it('isSocketAlive should return false if the socket is no longer connected', () => {
        service.socket.connected = false;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('isSocketAlive should return false if the socket is not defined', () => {
        (service.socket as unknown) = undefined;
        const isAlive = service.isSocketAlive();
        expect(isAlive).toBeFalsy();
    });

    it('should call socket.on with an event', () => {
        const event = 'helloWorld';
        const action = () => {
            return;
        };
        const spy = spyOn(service.socket, 'on');
        service.on(event, action);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event, action);
    });

    it('should call socket.off with an event', () => {
        const event = 'helloWorld';
        const action = () => {
            return;
        };
        const spy = spyOn(service.socket, 'off');
        service.off(event, action);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event, action);
    });

    it('should call emit with data when using send', () => {
        const event = 'helloWorld';
        const data = 42;
        const spy = spyOn(service.socket, 'emit');
        service.send(event, data);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event, data);
    });

    it('should call emit without data when using send if data is undefined', () => {
        const event = 'helloWorld';
        const data = undefined;
        const spy = spyOn(service.socket, 'emit');
        service.send(event, data);
        expect(spy).toHaveBeenCalled();
        expect(spy).toHaveBeenCalledWith(event);
    });

    it('should set id to socket id', () => {
        const spy = spyOn(service, 'on');
        service.socket.id = '4';
        spy.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'connect') {
                callback();
            }
        });
        service.connect();
        expect(service.id).toBeUndefined();
    });

    it('connect should call socket.connect if socket is not alive', () => {
        service.isSocketAlive = jasmine.createSpy().and.returnValue(false);
        service.connect();
        expect(service.socket).toBeDefined();
    });

    it('removeAllListeners should call socket.removeAllListeners', () => {
        service.socket.connected = true;
        const spy = spyOn(service.socket, 'removeAllListeners');
        service.removeAllListeners();
        expect(service.socket).toBeDefined();
        expect(spy).toHaveBeenCalled();
    });

    it('should handle errors', () => {
        spyOn(service, 'isSocketAlive').and.throwError('Connection error');
        service.connect();
        expect(service.id).toBe(service.socket.id);
        expect(service.isConnecting).toBe(false);
    });
});
