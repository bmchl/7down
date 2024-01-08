import { Component, OnInit } from '@angular/core';
import { CONSTS } from '@common/consts';
import { Game } from './../../../../../common/game';
import { RequestService } from './../../services/request.service';

@Component({
    selector: 'app-selection-page',
    templateUrl: './selection-page.component.html',
    styleUrls: ['./selection-page.component.scss'],
})
export class SelectionPageComponent implements OnInit {
    pageNumber: number = 0;
    games: Game[];
    maxPage: boolean;
    constructor(private request: RequestService) {}

    ngOnInit(): void {
        this.request.getRequest('games').subscribe((res: any) => {
            this.games = res;
            this.maxPage = this.pageNumber + 1 < Math.ceil(this.games.length / CONSTS.MAX_GAME_PER_PAGE);
        });
    }

    nextGames() {
        this.pageNumber += 1;
        this.maxPage = this.pageNumber + 1 < Math.ceil(this.games.length / CONSTS.MAX_GAME_PER_PAGE);
    }
    previousGames() {
        this.pageNumber -= 1;
        this.maxPage = this.pageNumber + 1 < Math.ceil(this.games.length / CONSTS.MAX_GAME_PER_PAGE);
    }
}
