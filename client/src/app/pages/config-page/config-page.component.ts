import { Component } from '@angular/core';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { SocketClientService } from '@app/services/socket-client.service';

@Component({
    selector: 'app-config-page',
    templateUrl: './config-page.component.html',
    styleUrls: ['./config-page.component.scss'],
})
export class ConfigPageComponent {
    constructor(private requestService: RequestService, public dialogService: CustomDialogService, private socketService: SocketClientService) {
        this.socketService.connect();
    }

    deleteAllGames() {
        this.socketService.send('delete-all-games');
    }

    resetGameHistory() {
        this.socketService.send('reset-game-history');
    }

    resetTimes() {
        this.socketService.send('reset-scores');
    }

    resetConsts() {
        this.requestService
            .putRequest('games/consts', {
                initialTime: '30',
                penalty: '5',
                timeGainPerDiff: '5',
            })
            .subscribe();
    }
}
