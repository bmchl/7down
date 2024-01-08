import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { GameData, PlayerIndex } from './../game-data';
import { DifferenceCountComponent } from './difference-count.component';

describe('DifferenceCountComponent', () => {
    let component: DifferenceCountComponent;
    let fixture: ComponentFixture<DifferenceCountComponent>;
    let mockHero: GameData;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DifferenceCountComponent, BasicDialogComponent],
            imports: [AppMaterialModule, BrowserAnimationsModule],
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
        fixture = TestBed.createComponent(DifferenceCountComponent);
        component = fixture.componentInstance;
        component.hero = mockHero;
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

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('roundNumber should round a number up', () => {
        const result = component.roundNumber(5.5);
        expect(result).toEqual(6);
    });
});
