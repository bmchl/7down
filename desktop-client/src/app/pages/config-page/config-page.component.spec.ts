import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ConfigSelectContentComponent } from '@app/components/config-select-content/config-select-content.component';
import { GamesDisplayComponent } from '@app/components/games-display/games-display.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { of } from 'rxjs';
import { GameHistoryComponent } from './../game-history/game-history.component';
import { ConfigPageComponent } from './config-page.component';

describe('ConfigPageComponent', () => {
    let component: ConfigPageComponent;
    let fixture: ComponentFixture<ConfigPageComponent>;
    let socketClientService: SocketClientService;
    let requestService: RequestService;

    beforeEach(async () => {
        socketClientService = jasmine.createSpyObj('SocketClientService', ['send', 'on', 'connect']);

        await TestBed.configureTestingModule({
            imports: [
                AppMaterialModule,
                HttpClientTestingModule,
                RouterTestingModule.withRoutes([{ path: 'history', component: GameHistoryComponent }]),
            ],
            declarations: [ConfigPageComponent, HeaderComponent, ConfigSelectContentComponent, GamesDisplayComponent, BasicDialogComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfigPageComponent);
        component = fixture.componentInstance;
        socketClientService = TestBed.inject(SocketClientService);
        requestService = TestBed.inject(RequestService);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('deleteAllGames should call socketService with delete-all-games', () => {
        const spy = spyOn(socketClientService, 'send');
        component.deleteAllGames();
        expect(spy).toHaveBeenCalledWith('delete-all-games');
    });

    it('resetTimes should call socketService with reset-scores', () => {
        const spy = spyOn(socketClientService, 'send');
        component.resetTimes();
        expect(spy).toHaveBeenCalledWith('reset-scores');
    });

    it('resetGameHistory should call socketService with reset-game-history', () => {
        const spy = spyOn(socketClientService, 'send');
        component.resetGameHistory();
        expect(spy).toHaveBeenCalledWith('reset-game-history');
    });

    it('resetConsts should call requestService with games/consts', () => {
        const spy = spyOn(requestService, 'putRequest').and.returnValue(of());
        component.resetConsts();
        expect(spy).toHaveBeenCalledWith('games/consts', {
            initialTime: '30',
            penalty: '5',
            timeGainPerDiff: '5',
        });
    });
});
