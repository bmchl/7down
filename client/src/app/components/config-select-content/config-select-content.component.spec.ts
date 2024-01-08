import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GamesDisplayComponent } from './../games-display/games-display.component';
import { HeaderComponent } from './../header/header.component';
import { RequestService } from './../../services/request.service';
import { ConfigSelectContentComponent } from './config-select-content.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';

describe('ConfigSelectContentComponent', () => {
    let component: ConfigSelectContentComponent;
    let request: RequestService;
    let fixture: ComponentFixture<ConfigSelectContentComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [ConfigSelectContentComponent, GamesDisplayComponent, HeaderComponent, InputDialogComponent, BasicDialogComponent],
            imports: [HttpClientTestingModule, AppMaterialModule],
            providers: [RequestService],
        }).compileComponents();

        fixture = TestBed.createComponent(ConfigSelectContentComponent);
        request = TestBed.inject(RequestService);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('previousGames should lower the pageNumber by one', () => {
        component.currentPage = 1;
        component.previousGames();
        expect(component.currentPage).toEqual(0);
    });

    it('nextGames should higher the pageNumber by one', () => {
        component.currentPage = 0;
        component.nextGames();
        expect(component.currentPage).toEqual(1);
    });

    it('ngOnInit should calculate correctly pageCount and get games', () => {
        const fakeGames = [
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
            {
                id: '3',
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
                id: '4',
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
                id: '5',
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
        spyOn(request, 'getRequest').and.callFake(() => of(fakeGames));
        component.ngOnInit();
        expect(component.games).toEqual(fakeGames);
        expect(component.games.length).toEqual(5);
        expect(component.pageCount).toEqual(2);
    });
});
