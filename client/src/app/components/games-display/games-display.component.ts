import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { Constants, Game } from './../../../../../common/game';
import { GameItemComponent } from './../game-item/game-item.component';

@Component({
    selector: 'app-games-display',
    templateUrl: './games-display.component.html',
    styleUrls: ['./games-display.component.scss'],
})
export class GamesDisplayComponent implements OnInit, OnDestroy {
    @Input() pageNumber: number;
    @Input() configOn: boolean;
    gameList: Game[];
    gameComponents: GameItemComponent[];
    constants: Constants;

    constructor(private request: RequestService, private socketService: SocketClientService) {}

    fetchGames = () => {
        this.request.getRequest('games').subscribe((res: any) => {
            this.gameList = res;
        });
    };

    fetchConstants = () => {
        this.request.getRequest('games/consts').subscribe((res: any) => {
            this.constants = { initialTime: res.initialTime, penalty: res.penalty, timeGainPerDiff: res.timeGainPerDiff };
        });
    };

    ngOnInit(): void {
        this.fetchGames();
        this.fetchConstants();

        this.socketService.connect();

        this.socketService.on('refresh-games', this.fetchGames);
    }

    ngOnDestroy(): void {
        this.socketService.off('refresh-games', this.fetchGames);
    }
}
