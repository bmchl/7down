import { Injectable } from '@angular/core';
import { PlayerIndex } from '@app/components/game-data';
import { GameMessage, MessageType } from './game-message';

@Injectable({
    providedIn: 'root',
})
export class LocalMessagesService {
    messages: GameMessage[];
    chatBoxFlag: boolean = false;
    constructor() {
        this.messages = [];
    }
    reset() {
        this.messages = [];
    }
    getTimeString(): string {
        return new Date().toTimeString().slice(0, 8);
    }
    addMessage(type: MessageType, player: PlayerIndex, customTime?: string): void {
        const time = customTime ? customTime : this.getTimeString();
        this.messages.unshift({ time, player, type });
    }
    addChatMessage(player: PlayerIndex, value: string): void {
        this.messages.unshift({ player, type: MessageType.Chat, value });
    }
    add(value: string, customTime?: string) {
        const time = customTime ? customTime : this.getTimeString();
        this.messages.unshift({ time, player: PlayerIndex.None, type: MessageType.NewRecord, value });
    }
}
