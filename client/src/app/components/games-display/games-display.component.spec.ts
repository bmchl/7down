import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { RequestService } from '@app/services/request.service';
import { of } from 'rxjs';
import { GamesDisplayComponent } from './games-display.component';

describe('GamesDisplayComponent', () => {
    let component: GamesDisplayComponent;
    let fixture: ComponentFixture<GamesDisplayComponent>;
    let request: RequestService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, AppMaterialModule, FormsModule, BrowserAnimationsModule],
            declarations: [GamesDisplayComponent, InputDialogComponent, BasicDialogComponent],
            providers: [RequestService],
        }).compileComponents();

        fixture = TestBed.createComponent(GamesDisplayComponent);
        component = fixture.componentInstance;
        request = TestBed.inject(RequestService);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should fetch games data from the API', () => {
        const mockGames = [
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

        spyOn(request, 'getRequest').and.callFake(() => of(mockGames));
        component.ngOnInit();
        expect(component.gameList).toEqual(mockGames);
    });
});
