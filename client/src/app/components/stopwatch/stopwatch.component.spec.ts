import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeFormatting } from '@app/classes/time-formatting';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { GameData } from './../game-data';
import { StopwatchComponent } from './stopwatch.component';

describe('StopwatchComponent', () => {
    let component: StopwatchComponent;
    let fixture: ComponentFixture<StopwatchComponent>;
    let mockHero: GameData;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [StopwatchComponent, BasicDialogComponent],
            imports: [AppMaterialModule],
        }).compileComponents();
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
        fixture = TestBed.createComponent(StopwatchComponent);
        component = fixture.componentInstance;
        component.hero = mockHero;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('fetchTime should call formatTime', () => {
        component.time.format = jasmine.createSpy();
        component.fetchTime();
        expect(component.time.format).toHaveBeenCalled();
    });

    it('should decrease time if hero mode is "tl"', (done) => {
        const decreaseTimeSpy = spyOn(component, 'decreaseTime');
        component.hero.startDate = 1618836443391;
        component.hero.isOver = false;
        component.hero.mode = 'tl';
        component.ngOnInit();
        setTimeout(() => {
            expect(decreaseTimeSpy).toHaveBeenCalled();
            done();
        }, 1000);
    });

    it('should properly calculate time when decreasing', () => {
        component.hero.initialTime = 15000000000000;
        component.time = jasmine.createSpyObj(TimeFormatting, ['format']);
        component.decreaseTime();
        expect(component.time.format).toHaveBeenCalled();
    });

    it('should call fetchTime method if hero mode is not "tl"', () => {
        const fetchTimeSpy = spyOn(component, 'fetchTime');
        component.hero.startDate = 1618836443391;
        component.hero.isOver = false;
        component.hero.mode = 'classique';
        component.ngOnInit();
        expect(fetchTimeSpy).toHaveBeenCalled();
    });

    it('should call clearInterval and timerEnd methods if remainingTime is 0', () => {
        spyOn(window, 'clearInterval');
        component.timerEnd = jasmine.createSpy().and.callFake(() => {
            return;
        });
        component.hero.startDate = 1618836443391 - 150000;
        component.hero.initialTime = 0;
        component.hero.hintsUsed = 2;
        component.hero.penalty = 5;
        component.hero.isOver = false;
        component.decreaseTime();
        expect(window.clearInterval).toHaveBeenCalledWith(component.interval);
        expect(component.timerEnd).toHaveBeenCalled();
    });
});
