import { Component, Input, OnInit } from '@angular/core';
import { CONSTS } from '@common/consts';
import { Game } from './../../../../../common/game';
import { RequestService } from './../../services/request.service';

@Component({
    selector: 'app-config-select-content.',
    templateUrl: './config-select-content.component.html',
    styleUrls: ['./config-select-content.component.scss'],
})
export class ConfigSelectContentComponent implements OnInit {
    @Input() configOn: boolean;
    games: Game[];
    currentPage: number = 0;
    pageCount: number;
    gamesLoaded: boolean = false;

    constructor(private request: RequestService) {}
    ngOnInit() {
        this.request.getRequest('games').subscribe((res: any) => {
            this.games = res;
            this.pageCount = Math.ceil(this.games.length / CONSTS.MAX_GAME_PER_PAGE);
            this.gamesLoaded = true;
        });
    }
    nextGames() {
        this.currentPage += 1;
    }
    previousGames() {
        this.currentPage -= 1;
    }
}
