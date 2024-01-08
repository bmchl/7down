import { Component, Input } from '@angular/core';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { SocketClientService } from '@app/services/socket-client.service';

import { GameData } from './../game-data';

@Component({
    selector: 'app-game-info',
    templateUrl: './game-info.component.html',
    styleUrls: ['./game-info.component.scss'],
})
export class GameInfoComponent {
    @Input() hero: GameData;
    @Input() abandonGame: () => void;

    constructor(
        public customDialogService: CustomDialogService,
        public localMessages: LocalMessagesService,
        public socketService: SocketClientService,
    ) {
        this.socketService.connect();
    }

    triggerQuitDialog() {
        this.customDialogService
            .openDialog({
                title: 'Êtes-vous sûr(e) de vouloir abandonner?',
                cancel: 'Revenir',
                confirm: 'Abandonner',
                routerLink: this.hero.mode === 'tl' ? '/' : '/select',
            })
            .afterClosed()
            .subscribe((confirm: boolean) => {
                if (confirm) this.abandonGame();
            });
    }
}
