/* eslint-dis   le max-lines */
import { Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { Vec2 } from '@app/interfaces/vec2';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { DrawService } from '@app/services/draw.service';
import { MessageType } from '@app/services/game-message';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { Coordinates } from '@app/services/tools.service';
import { NewMatch } from '@common/game';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CONSTS, MouseButton } from './../../../../../common/consts';
import { PlayerIndex } from './../game-data';

const DEFAULT_WIDTH = CONSTS.DEFAULT_WIDTH;
const DEFAULT_HEIGHT = CONSTS.DEFAULT_HEIGHT;
const DEFAULT_QUADRANT_WIDTH = CONSTS.DEFAULT_QUADRANT_WIDTH;
const DEFAULT_QUADRANT_HEIGHT = CONSTS.DEFAULT_QUADRANT_HEIGHT;
const DEFAULT_SUB_QUADRANT_WIDTH = CONSTS.DEFAULT_SUB_QUADRANT_WIDTH;
const DEFAULT_SUB_QUADRANT_HEIGHT = CONSTS.DEFAULT_SUB_QUADRANT_HEIGHT;

@Component({
    selector: 'app-play-area',
    templateUrl: './play-area.component.html',
    styleUrls: ['./play-area.component.scss'],
})
export class PlayAreaComponent implements OnInit, OnChanges, OnDestroy {
    @Input() images: string[];
    @Input() differences: number[][][];
    @Input() isTimeLimited: boolean;
    @Input() getPlayerName: (player: PlayerIndex) => string;

    @ViewChild('gridCanvas0', { static: false }) canvas0!: ElementRef<HTMLCanvasElement>;
    @ViewChild('gridCanvas1', { static: false }) canvas1!: ElementRef<HTMLCanvasElement>;
    @ViewChild('gridCanvas2', { static: false }) canvas2!: ElementRef<HTMLCanvasElement>;
    @ViewChild('gridCanvas3', { static: false }) canvas3!: ElementRef<HTMLCanvasElement>;
    serverPath = environment.serverUrl;
    mousePosition: Vec2 = { x: 0, y: 0 };
    originalImage = new Image();
    modifiedImage = new Image();
    found: number[] = [];
    error = this.drawService.error;
    isCheatMode: boolean = false;
    isClueMode: boolean = false;
    originalImageData: ImageData;
    diffImageData: ImageData;
    canvasSize = { x: DEFAULT_WIDTH, y: DEFAULT_HEIGHT };
    quadrantSize = { x: DEFAULT_QUADRANT_WIDTH, y: DEFAULT_QUADRANT_HEIGHT };
    subQuadrantSize = { x: DEFAULT_SUB_QUADRANT_WIDTH, y: DEFAULT_SUB_QUADRANT_HEIGHT };
    uid: string | null;

    selectedPlayer: number = -1;

    get activePlayers() {
        return this.gameService.match.players.filter((player) => !player.forfeitter);
    }

    //

    isDrawing: boolean = false;
    currentCoordinates: Coordinates = { x: 0, y: 0 };
    previousCoordinates: Coordinates = { x: 0, y: 0 };
    onTimeOut: boolean = false;

    //

    loadingDialogRef: MatDialogRef<LoadingDialogComponent, any>;
    private blinkSubscription: Subscription;
    private resetSubscription: Subscription;
    private drawErrorSubscription: Subscription;
    // eslint-disable-next-line max-params
    constructor(
        private zone: NgZone,
        private router: Router,
        public customDialogService: CustomDialogService,
        private readonly drawService: DrawService,
        public localMessages: LocalMessagesService,
        public socketService: SocketClientService,
        public replayService: ReplayService,
        public gameService: ClassicGameLogicService,
        public authService: AuthService,
        public translateService: TranslateService,
    ) {
        window.addEventListener('keyup', this.detectKeyPress);
    }

    get width(): number {
        return this.canvasSize.x;
    }

    get height(): number {
        return this.canvasSize.y;
    }

    get quadrantWidth(): number {
        return this.quadrantSize.x;
    }

    get quadrantHeight(): number {
        return this.quadrantSize.y;
    }

    get subQuadrantWidth(): number {
        return this.subQuadrantSize.x;
    }

    get subQuadrantHeight(): number {
        return this.subQuadrantSize.y;
    }

    detectKeyPress = (event: KeyboardEvent) => {
        if (event.key === 't') {
            this.toggleCheatMode();
        }
    };

    toggleCheatMode = () => {
        if (
            this.replayService.isDisplaying ||
            this.gameService.spectator ||
            this.gameService.match.winnerSocketId !== undefined ||
            !this.gameService.match.cheatAllowed
        )
            return;
        this.isCheatMode = !this.isCheatMode;
        if (this.isCheatMode) {
            setTimeout(() => {
                this.cheatBlink(this.originalImageData, this.diffImageData, this.drawService.context1);
            }, 125);
            this.cheatBlink(this.diffImageData, this.originalImageData, this.drawService.context);
        }
    };

    getCoordinates(event: MouseEvent): Coordinates {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return { x, y };
    }

    mouseDownEvent = (event: MouseEvent) => {
        if (!this.gameService.spectator || this.onTimeOut) return;

        this.isDrawing = true;
        this.previousCoordinates = this.getCoordinates(event);
    };

    mouseEnterEvent = (event: MouseEvent) => {
        if (!this.gameService.spectator || this.onTimeOut) return;

        this.previousCoordinates = this.getCoordinates(event);
        this.mouseUpEvent(event);
    };

    mouseMoveEvent = (event: MouseEvent) => {
        if (!this.gameService.spectator || this.onTimeOut) return;
        if (!this.isDrawing || (event.target !== this.canvas2.nativeElement && event.target !== this.canvas3.nativeElement)) return;
        this.currentCoordinates = this.getCoordinates(event);

        const contexts = [
            this.canvas2.nativeElement.getContext('2d') as CanvasRenderingContext2D,
            this.canvas3.nativeElement.getContext('2d') as CanvasRenderingContext2D,
        ];

        contexts.forEach((context) => {
            context.strokeStyle = 'red';
            context.clearRect(0, 0, this.canvas2.nativeElement.width, this.canvas2.nativeElement.height);
            context.strokeRect(
                this.previousCoordinates.x,
                this.previousCoordinates.y,
                this.currentCoordinates.x - this.previousCoordinates.x,
                this.currentCoordinates.y - this.previousCoordinates.y,
            );
        });
    };

    mouseUpEvent = (event: MouseEvent) => {
        if (!this.gameService.spectator) {
            this.mouseHitDetect(event);
            return;
        }
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.onTimeOut = true;

        this.socketService.send('s/draw-hint', {
            x: this.previousCoordinates.x,
            y: this.previousCoordinates.y,
            width: this.currentCoordinates.x - this.previousCoordinates.x,
            height: this.currentCoordinates.y - this.previousCoordinates.y,
            toIndex: this.selectedPlayer,
        });

        setTimeout(() => {
            const contexts = [
                this.canvas2.nativeElement.getContext('2d') as CanvasRenderingContext2D,
                this.canvas3.nativeElement.getContext('2d') as CanvasRenderingContext2D,
            ];

            contexts.forEach((context) => {
                context.clearRect(0, 0, this.canvas2.nativeElement.width, this.canvas2.nativeElement.height);
            });

            this.onTimeOut = false;
        }, 3000);
    };

    ngAfterViewInit(): void {
        const canvases = [this.canvas2, this.canvas3];

        canvases.forEach((canvas) => {
            canvas.nativeElement.addEventListener('mousedown', this.mouseDownEvent);
            canvas.nativeElement.addEventListener('mouseenter', this.mouseEnterEvent);
            canvas.nativeElement.addEventListener('mousemove', this.mouseMoveEvent);
            canvas.nativeElement.addEventListener('mouseup', this.mouseUpEvent);
        });
    }

    drawHint = (data: { x: number; y: number; width: number; height: number; toIndex: number; color: string }) => {
        console.log('draw hint', data);

        const shouldDrawHint =
            data.toIndex === -1 || (data.toIndex !== -1 && this.gameService.match.players[data.toIndex].id === this.socketService.id);

        if (this.gameService.spectator || !shouldDrawHint) return;

        const contexts = [
            this.canvas2.nativeElement.getContext('2d') as CanvasRenderingContext2D,
            this.canvas3.nativeElement.getContext('2d') as CanvasRenderingContext2D,
        ];

        contexts.forEach((context) => {
            context.strokeStyle = data.color;
            context.clearRect(0, 0, this.canvas2.nativeElement.width, this.canvas2.nativeElement.height);
            context.strokeRect(data.x, data.y, data.width, data.height);
        });

        setTimeout(() => {
            contexts.forEach((context) => {
                context.clearRect(0, 0, this.canvas2.nativeElement.width, this.canvas2.nativeElement.height);
            });
        }, 3000);
    };

    async ngOnInit(): Promise<void> {
        await this.socketService.connect();
        this.handleDifferenceNotifications();
        (async () => {
            if (!sessionStorage.getItem('user_uid')) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            const language = await this.authService.getLanguage(this.uid);
            this.translateService.use(language);
        })();
        this.socketService.on('validate-coords', this.validateCoords);
        this.socketService.on('game-ended', this.gameEnded);
        this.socketService.on('s/draw-hint', this.drawHint);
        this.blinkSubscription = this.replayService.blinkEmit.subscribe((data) => {
            console.log('blinking');
            this.blinkDifference(data.diff, data.speed);
        });
        this.resetSubscription = this.replayService.resetImage.subscribe(() => {
            console.log('reset');
            this.modifiedImage.src = this.serverPath + this.images[1];
        });
        this.drawErrorSubscription = this.replayService.drawError.subscribe((coords) => {
            console.log('error');
            this.drawService.drawError(coords.x, coords.y);
        });
    }

    gameEnded = (data: { match: NewMatch }) => {
        this.gameService.match = data.match;
        this.isCheatMode = false;
        this.replayService.setGameTime((this.gameService.match.endTime ?? 0) - this.gameService.match.startTime);
        console.log('winner', this.gameService.match.winnerSocketId, this.socketService.id);

        let dialogTitle = `${
            this.socketService.id === this.gameService.match.winnerSocketId
                ? 'Félicitations, vous avez'
                : `${this.gameService.match.players.find((player) => player.id == this.gameService.match.winnerSocketId)?.name} a`
        } gagné!`;
        this.customDialogService
            .openDialog({
                title: dialogTitle,
                confirm: 'Revenir à la page principale',
                cancel: 'Rejouer',
            })
            .afterClosed()
            .subscribe((result: string | boolean) => {
                if (result === true) {
                    this.zone.run(() => {
                        this.router.navigate(['/classic']);
                    });
                } else if (result === false) {
                    this.replayService.isDisplaying = true;
                    this.modifiedImage.src = this.serverPath + this.images[1];
                    this.localMessages.reset();
                    this.replayService.reset();
                    this.replayService.replay();
                }
            });
    };

    startReplay() {
        this.replayService.isDisplaying = true;
        this.replayService.replay();
        this.loadingDialogRef.close();
    }

    validateCoords = (data: { res: number; x: number; y: number }) => {
        if (data.res >= 0) {
            this.replayService.logClick(PlayerIndex.Player1, data.res);
            if (this.gameService.match.gamemode === 'classic') this.found.push(data.res);
            this.blinkDifference(data.res);
            this.drawService.drawDifference();
            this.localMessages.addMessage(MessageType.DifferenceFound, PlayerIndex.Player1);
        } else {
            this.replayService.logError(PlayerIndex.Player1, data);
            this.localMessages.addMessage(MessageType.Error, PlayerIndex.Player1);
            this.drawService.drawError(data.x, data.y);
        }
    };

    handleDifferenceNotifications() {
        this.socketService.on('notify-difference-found', (data: any) => {
            this.blinkDifference(data.diff);
            this.localMessages.addMessage(MessageType.DifferenceFound, data.playerIndex);
            this.replayService.logClick(data.playerIndex, data.diff);
        });
        this.socketService.on('notify-difference-error', (data: any) => {
            this.localMessages.addMessage(MessageType.Error, data.playerIndex);
            this.replayService.logOtherError(data.playerIndex);
        });
    }

    filterDifferences = () => {
        if (this.replayService.isDisplaying) return;
        if (
            this.gameService.match.gamemode == 'classic' &&
            (this.gameService.match.foundDifferencesIndex ?? []).length > 0 &&
            this.differences &&
            this.originalImageData &&
            this.diffImageData
        ) {
            for (let i = 0; i < this.differences.length; i++) {
                if (this.gameService.match.foundDifferencesIndex?.includes(i)) {
                    this.differences[i].forEach((pos: number[]) => {
                        const index = (pos[1] * 640 + pos[0]) * 4;
                        const pxFromLeft = [
                            this.originalImageData.data[index],
                            this.originalImageData.data[index + 1],
                            this.originalImageData.data[index + 2],
                            this.originalImageData.data[index + 3],
                        ];
                        this.diffImageData.data[index] = this.originalImageData.data[index];
                        this.diffImageData.data[index + 1] = this.originalImageData.data[index + 1];
                        this.diffImageData.data[index + 2] = this.originalImageData.data[index + 2];
                        this.diffImageData.data[index + 3] = this.originalImageData.data[index + 3];
                        this.drawService.context1.fillStyle = `rgba(${pxFromLeft.join(',')})`;
                        this.drawService.context1.fillRect(pos[0], pos[1], 1, 1);
                    });
                }
            }
        }

        if (this.gameService.match.gamemode == 'time-limit' && this.differences && this.originalImageData && this.diffImageData)
            for (let i = 0; i < this.differences.length; i++) {
                if (i == this.gameService.match.differenceIndex?.[this.gameService.match.gamesIndex ?? 0]) continue;
                this.differences[i].forEach((pos: number[]) => {
                    const index = (pos[1] * 640 + pos[0]) * 4;
                    const pxFromLeft = [
                        this.originalImageData.data[index],
                        this.originalImageData.data[index + 1],
                        this.originalImageData.data[index + 2],
                        this.originalImageData.data[index + 3],
                    ];
                    this.diffImageData.data[index] = this.originalImageData.data[index];
                    this.diffImageData.data[index + 1] = this.originalImageData.data[index + 1];
                    this.diffImageData.data[index + 2] = this.originalImageData.data[index + 2];
                    this.diffImageData.data[index + 3] = this.originalImageData.data[index + 3];
                    this.drawService.context1.fillStyle = `rgba(${pxFromLeft.join(',')})`;
                    this.drawService.context1.fillRect(pos[0], pos[1], 1, 1);
                });
            }
    };

    ngOnChanges() {
        this.originalImage.onload = () => {
            this.drawService.context = this.canvas0.nativeElement.getContext('2d') as CanvasRenderingContext2D;
            this.drawService.context.drawImage(this.originalImage, 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            this.originalImageData = this.drawService.context.getImageData(0, 0, CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT);
            this.canvas0.nativeElement.focus();
            this.filterDifferences();
        };

        this.modifiedImage.onload = () => {
            this.drawService.context1 = this.canvas1.nativeElement.getContext('2d') as CanvasRenderingContext2D;
            this.drawService.context1.drawImage(this.modifiedImage, 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            this.diffImageData = this.drawService.context1.getImageData(0, 0, CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT);
            this.canvas1.nativeElement.focus();
            this.filterDifferences();
        };
        this.originalImage.crossOrigin = 'Anonymous';
        this.modifiedImage.crossOrigin = 'Anonymous';
        this.originalImage.src = this.serverPath + this.images[0];
        this.modifiedImage.src = this.serverPath + this.images[1];
    }

    blinkDifference = (diff: any, speed: number = 1) => {
        if (this.gameService.match.gamemode == 'time-limit') {
            this.drawService.isWaiting = false;
            return;
        }
        if (!this.isCheatMode) {
            let i = 0;
            const base = this.drawService.context1.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            const inter = setInterval(() => {
                if (i % 2 === 0) {
                    this.differences[diff].forEach((pos: number[]) => {
                        const pxFromLeft = this.drawService.context.getImageData(pos[0], pos[1], 1, 1).data;
                        this.drawService.context1.fillStyle = `rgba(${pxFromLeft.join(',')})`;
                        this.drawService.context1.fillRect(pos[0], pos[1], 1, 1);
                    });
                } else {
                    this.drawService.context1.putImageData(base, 0, 0);
                }
                i++;
                if (i > 8) {
                    clearInterval(inter);
                    this.endHitDetect(diff);
                }
            }, 125 / speed);
        } else {
            this.endHitDetect(diff);
        }
    };

    cheatBlink(srcData: ImageData, dstData: ImageData, dstCtx: CanvasRenderingContext2D): void {
        let i = 0;
        const inter = setInterval(() => {
            if (!(this.replayService.isDisplaying || this.gameService.spectator || this.gameService.match.winnerSocketId !== undefined)) {
                if (i % 2 === 0 && this.differences) {
                    this.differences.forEach((diff) =>
                        diff.forEach((pos: number[]) => {
                            const index = (pos[1] * 640 + pos[0]) * 4;
                            const pxFromLeft = [srcData.data[index], srcData.data[index + 1], srcData.data[index + 2], srcData.data[index + 3]];
                            dstCtx.fillStyle = `rgba(${pxFromLeft.join(',')})`;
                            dstCtx.fillRect(pos[0], pos[1], 1, 1);
                        }),
                    );
                } else {
                    dstCtx.putImageData(dstData, 0, 0);
                }
            }
            i++;
            if (!this.isCheatMode) {
                dstCtx.putImageData(dstData, 0, 0);
                clearInterval(inter);
            }
        }, 125);
    }

    endHitDetect(res: number): void {
        this.drawService.isWaiting = false;
        this.differences[res].forEach((pos: number[]) => {
            const index = (pos[1] * 640 + pos[0]) * 4;
            const pxFromLeft = [
                this.originalImageData.data[index],
                this.originalImageData.data[index + 1],
                this.originalImageData.data[index + 2],
                this.originalImageData.data[index + 3],
            ];
            this.diffImageData.data[index] = this.originalImageData.data[index];
            this.diffImageData.data[index + 1] = this.originalImageData.data[index + 1];
            this.diffImageData.data[index + 2] = this.originalImageData.data[index + 2];
            this.diffImageData.data[index + 3] = this.originalImageData.data[index + 3];
            this.drawService.context1.fillStyle = `rgba(${pxFromLeft.join(',')})`;
            this.drawService.context1.fillRect(pos[0], pos[1], 1, 1);
        });
    }

    mouseHitDetect(event: MouseEvent) {
        if (
            this.drawService.error.show ||
            this.drawService.isWaiting ||
            this.gameService.match.winnerSocketId !== undefined ||
            this.gameService.spectator
        )
            return;

        if (event.button === MouseButton.Left) {
            this.mousePosition = { x: event.offsetX, y: event.offsetY };
            this.drawService.isWaiting = true;
            this.socketService.send(this.gameService.match.gamemode == 'time-limit' ? 'tl/validate-coords' : 'c/validate-coords', {
                x: this.mousePosition.x,
                y: this.mousePosition.y,
                found: this.found,
            });
        }
    }

    // getWinner(): string | null {
    //     if (!this.hero.isOver) {
    //         return null;
    //     }
    //     if (this.hero.multiplayer) {
    //         if (this.hero.differencesFound1 > this.hero.differencesFound2) {
    //             return this.getPlayerName(PlayerIndex.Player1);
    //         } else if (this.hero.differencesFound1 < this.hero.differencesFound2) {
    //             return this.getPlayerName(PlayerIndex.Player2);
    //         } else {
    //             return null;
    //         }
    //     } else {
    //         return this.getPlayerName(PlayerIndex.Player1);
    //     }
    // }

    ngOnDestroy() {
        window.removeEventListener('keyup', this.detectKeyPress);
        if (this.socketService) this.socketService.off(this.isTimeLimited ? 'validate-coords-tl' : 'validate-coords', this.validateCoords);
        this.blinkSubscription.unsubscribe();
        this.resetSubscription.unsubscribe();
        this.drawErrorSubscription.unsubscribe();
        this.replayService.ngOnDestroy();
    }
}
