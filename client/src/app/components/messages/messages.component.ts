import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MessageType } from '@app/services/game-message';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { GameData, PlayerIndex } from './../game-data';

@Component({
    selector: 'app-messages',
    templateUrl: './messages.component.html',
    styleUrls: ['./messages.component.scss'],
})
export class MessagesComponent implements OnChanges {
    @ViewChild('chatBox') chatBox: ElementRef<HTMLInputElement>;
    @Input() multiplayerOn: boolean;
    @Input() getPlayerName: (player: PlayerIndex) => string;
    @Input() hero: GameData;
    @Output() sendMessage: EventEmitter<string> = new EventEmitter<string>();

    constructor(public localMessages: LocalMessagesService, public socketClientService: SocketClientService, public replayService: ReplayService) {
        this.receiveChatMessage();
        this.receiveGlobalMessage();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.hero) {
            this.localMessages.reset();
        }
    }
    toggleFlag(value: boolean) {
        this.localMessages.chatBoxFlag = value;
    }
    formatContent(player: PlayerIndex, type: MessageType): string {
        let result: string;
        result = '';
        switch (type) {
            case MessageType.Abandonment: {
                result = this.getPlayerName(player) + ' a abandonné la partie';
                break;
            }
            case MessageType.DifferenceFound: {
                result = 'Différence trouvée';
                result += this.multiplayerOn ? ' par ' + this.getPlayerName(player) : '';
                break;
            }
            case MessageType.Error: {
                result = 'Erreur';
                result += this.multiplayerOn ? ' par ' + this.getPlayerName(player) : '';
                break;
            }
            case MessageType.HintUsed: {
                result += 'Indice utilisé';
                break;
            }
        }
        if (player !== 0) result += '.';
        return result;
    }

    receiveChatMessage(): void {
        this.socketClientService.on('room-message', (data: any) => {
            this.localMessages.addChatMessage(PlayerIndex.Player2, data.message);
            this.replayService.logChat(PlayerIndex.Player2, data.message);
        });
    }

    receiveGlobalMessage(): void {
        this.socketClientService.on('global-message', (data: any) => {
            const result = `${data.playerName} obtient la ${data.position}${
                data.position === 1 ? 'ère' : 'ème'
            } place dans les meilleurs temps du jeu ${data.gameName} en ${data.multiplayer ? 'multi-joueur' : 'solo'} `;
            this.localMessages.add(result);
            this.replayService.logGlobalMessage(result);
        });
    }

    sendChatMessage(msg: HTMLInputElement): void {
        if (msg.value.trim()) {
            this.socketClientService.send('room-message', { message: msg.value.trim() });
            this.localMessages.addChatMessage(PlayerIndex.Player1, msg.value.trim());
            this.replayService.logChat(PlayerIndex.Player1, msg.value.trim());
            msg.value = '';
        }
    }
}
