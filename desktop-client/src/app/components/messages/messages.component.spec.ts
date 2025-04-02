import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { MessageType } from '@app/services/game-message';
import { ReplayService } from '@app/services/replay.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { GameData, PlayerIndex } from './../game-data';
import { MessagesComponent } from './messages.component';
type CallbackSignature = (params?: any) => void;

describe('MessagesComponent', () => {
    let component: MessagesComponent;
    let fixture: ComponentFixture<MessagesComponent>;
    let socketClientService: jasmine.SpyObj<SocketClientService>;
    let replayService: jasmine.SpyObj<ReplayService>;

    beforeEach(async () => {
        socketClientService = jasmine.createSpyObj('SocketClientService', ['on', 'send']);
        replayService = jasmine.createSpyObj('ReplayService', ['logChat', 'logGlobalMessage']);
        await TestBed.configureTestingModule({
            imports: [AppMaterialModule, BrowserAnimationsModule],
            declarations: [MessagesComponent, BasicDialogComponent],
            providers: [
                { provide: SocketClientService, useValue: socketClientService },
                { provide: ReplayService, useValue: replayService },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(MessagesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        component.localMessages.addChatMessage = jasmine.createSpy();
        component.getPlayerName = jasmine.createSpy().and.callFake((player: PlayerIndex) => {
            let result = '';
            switch (player) {
                case PlayerIndex.Player1: {
                    result = 'player1';
                    break;
                }
                case PlayerIndex.Player2: {
                    result = 'player2';
                    break;
                }
            }
            return result;
        });
        component.hero = {
            id: '1',
            name: 'differences of the wild',
            difficulty: 5,
            penalty: 10,
            differenceCount: 7,
            mode: 'Classique',
            multiplayer: false,
            hintsUsed: 0,
            differencesFound1: 5,
            differencesFound2: 0,
            startDate: 0,
            playerName1: 'Link',
            playerName2: '',
            matchId: '0',
        };
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should format abandonment message correctly', () => {
        const result = component.formatContent(PlayerIndex.Player1, MessageType.Abandonment);
        expect(result).toEqual('player1 a abandonné la partie.');
    });

    it('should format difference found message correctly in solo', () => {
        const result = component.formatContent(PlayerIndex.Player1, MessageType.DifferenceFound);
        expect(result).toEqual('Différence trouvée.');
    });

    it('should format indice utilise message correctly in solo', () => {
        const result = component.formatContent(PlayerIndex.Player1, MessageType.HintUsed);
        expect(result).toEqual('Indice utilisé.');
    });

    it('should format error message correctly in solo', () => {
        const result = component.formatContent(PlayerIndex.Player2, MessageType.Error);
        expect(result).toEqual('Erreur.');
    });
    it('should format difference found message correctly in multiplayer', () => {
        component.multiplayerOn = true;
        const result = component.formatContent(PlayerIndex.Player1, MessageType.DifferenceFound);
        expect(result).toEqual('Différence trouvée par player1.');
    });

    it('should format error message correctly in multiplayer', () => {
        component.multiplayerOn = true;
        const result = component.formatContent(PlayerIndex.Player2, MessageType.Error);
        expect(result).toEqual('Erreur par player2.');
    });

    it('should not add empty messages', () => {
        const inputElement = { value: '' } as HTMLInputElement;
        component.sendChatMessage(inputElement);
        expect(component.localMessages.addChatMessage).not.toHaveBeenCalled();
    });

    it('should add non-empty messages', () => {
        const inputElement = { value: 'test message' } as HTMLInputElement;
        component.sendChatMessage(inputElement);
        expect(component.localMessages.addChatMessage).toHaveBeenCalledWith(PlayerIndex.Player1, 'test message');
        expect(inputElement.value).toBe('');
    });

    it('should reset local messages when hero input changes', () => {
        component.localMessages.addChatMessage(PlayerIndex.Player1, 'Hello');
        component.ngOnChanges({ hero: new SimpleChange(null, { matchId: '456' } as GameData, true) });
        fixture.detectChanges();
        expect(component.localMessages.messages.length).toBe(0);
    });

    it('should add chat message to localMessages when receiving a room-message', () => {
        const message = 'Hello world';
        const data = { message };
        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'room-message') {
                callback(data);
            }
        });
        component.receiveChatMessage();
        expect(component.localMessages.addChatMessage).toHaveBeenCalledWith(PlayerIndex.Player2, message);
    });

    it('toggleFlag should correctly modify the chatBoxFlag value in LocalMessagesService', () => {
        component.toggleFlag(true);

        expect(component.localMessages.chatBoxFlag).toEqual(true);
    });

    it('receiveGlobalMessage should call localMessages.add when a 1st place solo global-message socket event is received', () => {
        const data = {
            playerName: 'hey',
            position: 1,
            gameName: 'game',
            multiplayer: false,
        };
        const expected = `${data.playerName} obtient la ${data.position}${
            data.position === 1 ? 'ère' : 'ème'
        } place dans les meilleurs temps du jeu ${data.gameName} en ${data.multiplayer ? 'multi-joueur' : 'solo'} `;
        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'global-message') {
                callback(data);
            }
        });
        component.localMessages.add = jasmine.createSpy();
        component.receiveGlobalMessage();
        expect(component.localMessages.add).toHaveBeenCalledWith(expected);
    });

    it('receiveGlobalMessage should call localMessages.add when a 2nd place multiplayer global-message socket event is received', () => {
        const data = {
            playerName: 'hey',
            position: 2,
            gameName: 'game',
            multiplayer: true,
        };
        const expected = `${data.playerName} obtient la ${data.position}${
            data.position === 1 ? 'ère' : 'ème'
        } place dans les meilleurs temps du jeu ${data.gameName} en ${data.multiplayer ? 'multi-joueur' : 'solo'} `;
        socketClientService.on.and.callFake((event: string, callback: CallbackSignature) => {
            if (event === 'global-message') {
                callback(data);
            }
        });
        component.localMessages.add = jasmine.createSpy();
        component.receiveGlobalMessage();
        expect(component.localMessages.add).toHaveBeenCalledWith(expected);
    });
});
