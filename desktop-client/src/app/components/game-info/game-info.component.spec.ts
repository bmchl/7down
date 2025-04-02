import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { of } from 'rxjs';
import { GameInfoComponent } from './game-info.component';

describe('GameInfoComponent', () => {
    let component: GameInfoComponent;
    let fixture: ComponentFixture<GameInfoComponent>;
    let customDialogService: jasmine.SpyObj<CustomDialogService>;
    let socketServiceSpy: jasmine.SpyObj<SocketClientService>;

    beforeEach(async () => {
        customDialogService = jasmine.createSpyObj('CustomDialogService', ['openDialog']);
        socketServiceSpy = jasmine.createSpyObj('SocketClientService', ['send', 'connect']);

        await TestBed.configureTestingModule({
            imports: [AppMaterialModule],
            providers: [
                { provide: CustomDialogService, useValue: customDialogService },
                { provide: SocketClientService, useValue: socketServiceSpy },
            ],
            declarations: [GameInfoComponent, BasicDialogComponent],
        }).compileComponents();
        fixture = TestBed.createComponent(GameInfoComponent);
        component = fixture.componentInstance;
        component.hero = {
            id: '0',
            name: 'name',
            mode: 'mode',
            multiplayer: false,
            difficulty: 7,
            penalty: 5,
            differenceCount: 7,
            hintsUsed: 0,
            differencesFound1: 0,
            differencesFound2: 0,
            startDate: 0,
            playerName1: 'player',
            playerName2: 'player',
        };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('triggerQuitDialog should call dialogServices.quitGameDialog and redirect to select in classic mode', () => {
        component.hero.mode = 'classique';
        customDialogService.openDialog.and.returnValue({
            afterClosed: () => of({ confirm: true }),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.abandonGame = jasmine.createSpy();
        component.triggerQuitDialog();
        expect(customDialogService.openDialog).toHaveBeenCalled();
    });

    it('triggerQuitDialog should call dialogServices.quitGameDialog and redirect to home in time limit mode', () => {
        component.hero.mode = 'tl';
        customDialogService.openDialog.and.returnValue({
            afterClosed: () => of({ confirm: true }),
        } as MatDialogRef<BasicDialogComponent, any>);
        component.abandonGame = jasmine.createSpy();
        component.triggerQuitDialog();
        expect(customDialogService.openDialog).toHaveBeenCalled();
    });
});
