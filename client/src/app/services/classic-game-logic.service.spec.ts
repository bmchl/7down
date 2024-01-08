import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ClassicGameLogicService } from './classic-game-logic.service';

describe('ClassicGameLogicService', () => {
    let service: ClassicGameLogicService;
    let routerSpy: jasmine.SpyObj<Router>;
    let zoneStub: Partial<NgZone>;
    beforeEach(() => {
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        zoneStub = {
            run: (fn: () => any) => fn(),
        };
        service = new ClassicGameLogicService(zoneStub as NgZone, routerSpy);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should navigate to home when onUndefinedHero is called', () => {
        service.onUndefinedHero();

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });
});
