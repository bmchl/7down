import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfigSelectContentComponent } from '@app/components/config-select-content/config-select-content.component';
import { GamesDisplayComponent } from '@app/components/games-display/games-display.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { of } from 'rxjs';
import { RequestService } from './../../services/request.service';
import { SelectionPageComponent } from './selection-page.component';

describe('SelectionPageComponent', () => {
    let component: SelectionPageComponent;
    let request: RequestService;
    let fixture: ComponentFixture<SelectionPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, AppMaterialModule],
            declarations: [SelectionPageComponent, ConfigSelectContentComponent, HeaderComponent, GamesDisplayComponent, BasicDialogComponent],
            providers: [RequestService],
        }).compileComponents();
        fixture = TestBed.createComponent(SelectionPageComponent);
        request = TestBed.inject(RequestService);
        component = fixture.componentInstance;
        component.games = [
            {
                id: '1',
                gameName: '',
                image: '',
                image1: '',
                imageDifference: [[[0, 0, 0]]],
                difficulty: 0,
                differenceCount: 0,
                penalty: 0,
                soloLeaderboard: [{ name: 'name', time: 0 }],
                multiLeaderboard: [{ name: 'name', time: 0 }],
            },
        ];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('previousGames should lower the pageNumber by one', () => {
        component.pageNumber = 2;
        component.previousGames();
        expect(component.pageNumber).toEqual(1);
    });
    it('nextGames should higher the pageNumber by one', () => {
        component.pageNumber = 1;
        component.nextGames();
        expect(component.pageNumber).toEqual(2);
    });

    it('should make an HTTP GET request to retrieve the list of games', () => {
        const games = [
            {
                id: '1',
                gameName: '',
                image: '',
                image1: '',
                imageDifference: [[[0, 0, 0]]],
                difficulty: 0,
                differenceCount: 0,
                penalty: 0,
                soloLeaderboard: [{ name: 'name', time: 0 }],
                multiLeaderboard: [{ name: 'name', time: 0 }],
            },
            {
                id: '2',
                gameName: '',
                image: '',
                image1: '',
                imageDifference: [[[0, 0, 0]]],
                difficulty: 0,
                differenceCount: 0,
                penalty: 0,
                soloLeaderboard: [{ name: 'name', time: 0 }],
                multiLeaderboard: [{ name: 'name', time: 0 }],
            },
        ];

        spyOn(request, 'getRequest').and.callFake(() => of(games));
        component.ngOnInit();
        expect(component.games).toEqual(games);
    });
});
