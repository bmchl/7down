import { EventEmitter, Injectable, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerIndex } from '@app/components/game-data';
import { ReplayEvent } from '@app/interfaces/replay-event';
import { MessageType } from '@app/services/game-message';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { getDatabase, push, ref, set } from 'firebase/database';
import { AuthService } from './auth-service';
import { ClassicGameLogicService } from './classic-game-logic.service';
import { CustomDialogService } from './custom-dialog.service';
import { SocketClientService } from './socket-client.service';

@Injectable({
    providedIn: 'root',
})
export class ReplayService implements OnDestroy, OnInit {
    blinkEmit = new EventEmitter<any>();
    resetImage = new EventEmitter<any>();
    drawError = new EventEmitter<any>();
    progressIndex: number = 0;
    progressTime: number | any = 0;
    gameTime: number;
    events: ReplayEvent[] = [];
    isDisplaying: boolean = false;
    timerInterval: any;
    replaySpeedValue: number = 1;
    isPause: boolean = false;
    startGameTime: number;
    interval = 10;
    timeBuffer: number = 1;
    timePositionChanged = new EventEmitter<number>();
    isSavedReplay = false;

    uid: string | null;

    // eslint-disable-next-line max-params
    constructor(
        public socket: SocketClientService,
        public localMessages: LocalMessagesService,
        public customDialogService: CustomDialogService,
        private zone: NgZone,
        public router: Router,
        public authService: AuthService,
        public gameService: ClassicGameLogicService,
    ) {
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', this.uid);
            console.log('hihihiih', this.uid);
        } else {
            this.uid = sessionStorage.getItem('user_uid');
            console.log('hihihiih2', this.uid);
        }
    }

    async ngOnInit(): Promise<void> {
        if (!sessionStorage.getItem('user_uid')) {
            this.uid = this.authService.getUID();
            sessionStorage.setItem('user_uid', this.uid);
            console.log('hihihiih', this.uid);
        } else {
            this.uid = sessionStorage.getItem('user_uid');
            console.log('hihihiih2', this.uid);
        }
    }

    getGameTime() {
        return Math.floor(this.gameTime);
    }
    getProgressTime() {
        return Math.floor(this.progressTime);
    }

    logChat(player: PlayerIndex, value: string) {
        this.events.push({
            type: 'chat',
            timestamp: (new Date().getTime() - this.startGameTime) / 1000,
            player,
            data: { value, time: new Date().toTimeString().slice(0, 8) },
        });
    }

    logGlobalMessage(value: string) {
        this.events.push({
            type: 'globalMessage',
            timestamp: (new Date().getTime() - this.startGameTime) / 1000,
            player: PlayerIndex.None,
            data: { value },
        });
    }

    logClick(player: PlayerIndex, diff: any) {
        this.events.push({
            type: 'click',
            timestamp: (new Date().getTime() - this.startGameTime) / 1000,
            player,
            data: { diff, time: new Date().toTimeString().slice(0, 8) },
        });
    }

    logError(player: PlayerIndex, coords: any) {
        this.events.push({
            type: 'error',
            timestamp: (new Date().getTime() - this.startGameTime) / 1000,
            player,
            data: { coords, time: new Date().toTimeString().slice(0, 8) },
        });
    }

    logOtherError(player: PlayerIndex) {
        this.events.push({
            type: 'otherError',
            timestamp: (new Date().getTime() - this.startGameTime) / 1000,
            player,
            data: { time: new Date().toTimeString().slice(0, 8) },
        });
    }

    replayOrResume() {
        console.log('events', this.events);
        this.timerInterval = setInterval(() => {
            this.progressTime += (this.interval * this.replaySpeedValue) / 1000;
            const event: ReplayEvent = this.events[this.progressIndex];
            if (event) {
                if (this.progressTime >= event.timestamp - this.timeBuffer) {
                    switch (event.type) {
                        case 'chat':
                            this.localMessages.addChatMessage(event.player, event.data.value);
                            break;
                        case 'globalMessage':
                            this.localMessages.add(event.data.value, event.data.time);
                            break;
                        case 'click':
                            this.blinkEmit.emit({ diff: event.data.diff, speed: this.replaySpeedValue });
                            this.localMessages.addMessage(MessageType.DifferenceFound, event.player, event.data.time);
                            break;
                        case 'error':
                            this.localMessages.addMessage(MessageType.Error, event.player, event.data.time);
                            this.drawError.emit(event.data.coords);
                            break;
                        case 'otherError':
                            this.localMessages.addMessage(MessageType.Error, event.player, event.data.time);
                            break;
                    }
                    this.progressIndex++;
                }
            }
            if (this.progressTime >= this.gameTime + this.timeBuffer) {
                this.openEndDialog();
                this.pause();
            }
        }, this.interval);
    }

    // -----

    // updateProgressTime(newTime: number) {
    //     this.pause();
    //     this.progressTime = newTime;
    //     this.progressIndex = this.events.findIndex((event) => event.timestamp >= newTime / 1000);
    //     if (!this.isPause) {
    //         this.resume();
    //     }
    //     this.timePositionChanged.emit(this.progressTime);
    // }

    seekToTime(newTime: number) {
        this.pause();
        this.progressTime = newTime;
        this.progressIndex = this.events.findIndex((event) => event.timestamp >= newTime / 1000);
        if (this.progressIndex === -1) {
            this.progressIndex = 0;
        }
        this.events = this.events.filter((event) => event.timestamp >= newTime / 1000);
        if (!this.isPause) {
            this.resume();
        }
    }

    // -----

    openEndDialog() {
        this.customDialogService
            .openDialog({
                title: 'Reprise de la partie terminée',
                confirm: 'Recommencer la reprise vidéo',
                cancel: 'Revenir à la page principale',
                saveReplay: this.isSavedReplay ? undefined : 'Sauvegarder la reprise',
            })
            .afterClosed()
            .subscribe((result: boolean) => {
                if (result === true) {
                    this.reset();
                    this.resume();
                } else if (result === false) {
                    this.zone.run(() => {
                        this.isDisplaying = false;
                        this.reset();
                        this.router.navigate(['/classic']);
                    });
                } else if (result === 'saveReplay') {
                    console.log('saving', this.uid, this.gameService.map?.id);
                    this.saveReplay(this.uid ?? '', this.gameService.map?.id ?? '');
                    this.zone.run(() => {
                        this.router.navigate(['/classic']);
                    });
                }
            });
    }

    replay() {
        this.replayOrResume();
    }

    pause() {
        this.isPause = true;
        clearInterval(this.timerInterval);
    }

    resume() {
        this.isPause = false;
        this.replayOrResume();
    }

    toggleReplay() {
        if (this.isPause) this.resume();
        else this.pause();
    }

    setGameTime(time: number) {
        this.gameTime = time / 1000;
    }

    saveStartTime() {
        this.startGameTime = new Date().getTime();
    }

    reset() {
        this.progressIndex = 0;
        this.progressTime = 0;
        this.localMessages.reset();
        this.resetImage.emit();
    }

    saveReplay(uid: string, mapId: string) {
        const db = getDatabase();
        const userRef = ref(db, `users/${uid}/replayEvents`);

        const replayRef = push(userRef);

        set(replayRef, { startGameTime: this.startGameTime, gameTime: this.gameTime, events: this.events, mapId: mapId })
            .then(() => {
                console.log('Replay events saved successfully!');
            })
            .catch((error: any) => {
                console.error('Error saving replay events:', error);
            });
    }

    ngOnDestroy() {
        this.progressIndex = 0;
        this.progressTime = 0;
        this.gameTime = 0;
        this.events = [];
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.replaySpeedValue = 1;
        this.isPause = false;
        this.startGameTime = 0;
        this.isDisplaying = false;
        this.isSavedReplay = false;
    }
}
