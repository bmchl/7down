import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { GameData } from './../game-data';
import { HintsComponent } from './hints.component';

describe('HintsComponent', () => {
    let component: HintsComponent;
    let fixture: ComponentFixture<HintsComponent>;
    let mockHero: GameData;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [HintsComponent, BasicDialogComponent],
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
        fixture = TestBed.createComponent(HintsComponent);
        component = fixture.componentInstance;
        component.hero = mockHero;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
