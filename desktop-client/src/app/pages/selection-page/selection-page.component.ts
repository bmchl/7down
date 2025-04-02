import { Component, OnInit } from '@angular/core';
import { Game } from './../../../../../common/game';
import { RequestService } from './../../services/request.service';

@Component({
    selector: 'app-selection-page',
    templateUrl: './selection-page.component.html',
    styleUrls: ['./selection-page.component.scss'],
})
export class SelectionPageComponent implements OnInit {
    games: Game[];
    gamesLoaded = false;
    isChatMinimized: boolean = true;
    isDarkMode: boolean = false;
    constructor(private request: RequestService) {}

    ngOnInit(): void {
        this.request.getRequest('games').subscribe((res: any) => {
            this.games = res;
            this.gamesLoaded = true;
        });
    }

    toggleChatMinimize() {
        this.isChatMinimized = !this.isChatMinimized;
    }
}
