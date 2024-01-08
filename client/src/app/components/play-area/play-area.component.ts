/* eslint-disable max-lines */
import { Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { Vec2 } from '@app/interfaces/vec2';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { DrawService } from '@app/services/draw.service';
import { MessageType } from '@app/services/game-message';
import { LocalMessagesService } from '@app/services/local-messages.service';
import { ReplayService } from '@app/services/replay.service';
import { SocketClientService } from '@app/services/socket-client.service';
import { Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CONSTS, MouseButton } from './../../../../../common/consts';
import { GameData, PlayerIndex } from './../game-data';

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
    @Input() hero: GameData;
    @Input() isTimeLimited: boolean;
    @Input() getPlayerName: (player: PlayerIndex) => string;

    @ViewChild('gridCanvas0', { static: false }) canvas0!: ElementRef<HTMLCanvasElement>;
    @ViewChild('gridCanvas1', { static: false }) canvas1!: ElementRef<HTMLCanvasElement>;
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
    ) {
        if (!this.isTimeLimited) {
            this.socketService.connect();
        }
        this.handleDifferenceNotifications();

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
        if (event.key === 'i') {
            this.getClue();
        }
    };

    toggleCheatMode = () => {
        this.isCheatMode = !this.isCheatMode;
        if (this.isCheatMode) {
            setTimeout(() => {
                this.cheatBlink(this.originalImageData, this.diffImageData, this.drawService.context1);
            }, 125);
            this.cheatBlink(this.diffImageData, this.originalImageData, this.drawService.context);
        }
    };

    getClue = () => {
        if (!this.hero.multiplayer) {
            if (this.hero.hintsUsed < 3) {
                this.localMessages.addMessage(MessageType.HintUsed, PlayerIndex.Player1);
                this.hero.hintsUsed++;

                if (this.hero.hintsUsed === 1) this.clueOneQuadrant();
                if (this.hero.hintsUsed === 2) this.clueTwoQuadrant();
                if (this.hero.hintsUsed === 3) this.clueThreeQuadrant();
            }
        }
    };

    ngOnInit(): void {
        this.socketService.on('validate-coords', this.validateCoords);
        this.blinkSubscription = this.replayService.blinkEmit.subscribe((data) => {
            this.blinkDifference(data.diff, data.speed);
        });
        this.resetSubscription = this.replayService.resetImage.subscribe(() => {
            this.modifiedImage.src = this.serverPath + this.images[1];
        });
        this.drawErrorSubscription = this.replayService.drawError.subscribe((coords) => {
            this.drawService.drawError(coords.x, coords.y);
        });
    }

    validateCoords = (data: { res: number; x: number; y: number }) => {
        if (data.res >= 0) {
            this.replayService.logClick(PlayerIndex.Player1, data.res);
            this.found.push(data.res);
            this.blinkDifference(data.res);
            this.drawService.drawDifference();
            this.incrementDifferences(PlayerIndex.Player1);
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
            this.incrementDifferences(PlayerIndex.Player2);
            this.localMessages.addMessage(MessageType.DifferenceFound, PlayerIndex.Player2);
            this.replayService.logClick(PlayerIndex.Player2, data.diff);
        });
        this.socketService.on('notify-difference-error', () => {
            this.localMessages.addMessage(MessageType.Error, PlayerIndex.Player2);
            this.replayService.logOtherError(PlayerIndex.Player2);
        });
    }

    incrementDifferences(playerIndex: PlayerIndex) {
        let diffFound = playerIndex === PlayerIndex.Player1 ? this.hero.differencesFound1 : this.hero.differencesFound2;
        if (diffFound < this.hero.differenceCount) {
            diffFound++;
        }

        if (playerIndex === PlayerIndex.Player1) this.hero.differencesFound1 = diffFound;
        else this.hero.differencesFound2 = diffFound;

        if (
            (diffFound === this.hero.differenceCount && !this.hero.multiplayer) ||
            (diffFound === Math.ceil(this.hero.differenceCount / 2) && this.hero.multiplayer)
        ) {
            this.hero.isOver = true;
            const winner = this.getWinner();
            this.socketService.send('game-end', { winner, hintsUsed: this.hero.hintsUsed, penalty: this.hero.penalty });

            this.loadingDialogRef = this.customDialogService.openLoadingDialog('En attente des résultats...');
            this.socketService.on('new-record', (data: any) => {
                this.hero.isOver = true;
                this.replayService.setGameTime(data.completionTime);
                this.loadingDialogRef.close();
                let dialogTitle: string =
                    `${playerIndex === PlayerIndex.Player1 ? 'Félicitations, vous avez' : 'Votre adversaire a'} trouvé les ` +
                    (this.hero.multiplayer ? Math.ceil(this.hero.differenceCount / 2) : this.hero.differenceCount) +
                    ' différences!';
                if (data.newRecord !== false) {
                    dialogTitle += ` De plus, le joueur ${this.getPlayerName(playerIndex)} a obtenu la ${data.newRecord}${
                        data.newRecord === 1 ? 'ère' : 'ème'
                    } place dans les meilleurs temps de ce jeu!`;
                    this.socketService.send('global-message', {
                        playerName: this.getPlayerName(playerIndex),
                        position: data.newRecord,
                        gameName: this.hero.name,
                        multiplayer: this.hero.multiplayer,
                    });
                }
                this.customDialogService
                    .openDialog({
                        title: dialogTitle,
                        confirm: 'Commencer la reprise vidéo',
                        cancel: 'Revenir à la page principale',
                    })
                    .afterClosed()
                    .subscribe((result: boolean) => {
                        if (result) {
                            this.replayService.isDisplaying = true;
                            this.modifiedImage.src = this.serverPath + this.images[1];
                            this.localMessages.reset();
                            this.replayService.replay();
                        } else {
                            this.zone.run(() => {
                                this.router.navigate(['/']);
                            });
                        }
                    });
            });
        }
    }

    ngOnChanges() {
        this.originalImage.onload = () => {
            this.drawService.context = this.canvas0.nativeElement.getContext('2d') as CanvasRenderingContext2D;
            this.drawService.context.drawImage(this.originalImage, 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            this.originalImageData = this.drawService.context.getImageData(0, 0, CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT);
            this.canvas0.nativeElement.focus();
        };

        this.modifiedImage.onload = () => {
            this.drawService.context1 = this.canvas1.nativeElement.getContext('2d') as CanvasRenderingContext2D;
            this.drawService.context1.drawImage(this.modifiedImage, 0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
            this.diffImageData = this.drawService.context1.getImageData(0, 0, CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT);
            this.canvas1.nativeElement.focus();
        };
        this.originalImage.crossOrigin = 'Anonymous';
        this.modifiedImage.crossOrigin = 'Anonymous';
        this.originalImage.src = this.serverPath + this.images[0];
        this.modifiedImage.src = this.serverPath + this.images[1];
    }

    blinkDifference = (diff: any, speed: number = 1) => {
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
            i++;
            if (!this.isCheatMode) {
                dstCtx.putImageData(dstData, 0, 0);
                clearInterval(inter);
            }
        }, 125);
    }

    clue(): number[][] {
        const differences = this.differences;
        let randomDifferencesIndex = Math.floor(Math.random() * differences.length);
        while (this.found.includes(randomDifferencesIndex)) {
            randomDifferencesIndex = Math.floor(Math.random() * differences.length);
        }
        const randomDifferences = differences[randomDifferencesIndex];
        return randomDifferences;
    }

    clueOneQuadrant(): void {
        const randomDifferences = this.clue();
        const x = randomDifferences[0][0];
        const y = randomDifferences[0][1];
        const quadrantWidth = this.quadrantWidth;
        const quadrantHeight = this.quadrantHeight;

        const subQuadrantX = Math.floor(x / quadrantWidth);
        const subQuadrantY = Math.floor(y / quadrantHeight);

        const subQuadrantLeft = subQuadrantX * quadrantWidth;
        const subQuadrantTop = subQuadrantY * quadrantHeight;

        this.drawService.context.beginPath();
        this.drawService.context.rect(subQuadrantLeft, subQuadrantTop, quadrantWidth, quadrantHeight);
        this.drawService.context.lineWidth = 3;
        this.drawService.context.strokeStyle = 'yellow';
        this.drawService.context.stroke();
    }

    clueTwoQuadrant(): void {
        const randomDifferences = this.clue();
        const x = randomDifferences[0][0];
        const y = randomDifferences[0][1];
        const subQuadrantWidth = this.subQuadrantWidth;
        const subQuadrantHeight = this.subQuadrantHeight;

        const subQuadrantX = Math.floor(x / subQuadrantWidth);
        const subQuadrantY = Math.floor(y / subQuadrantHeight);

        const subQuadrantLeft = subQuadrantX * subQuadrantWidth;
        const subQuadrantTop = subQuadrantY * subQuadrantHeight;

        this.drawService.context.beginPath();
        this.drawService.context.rect(subQuadrantLeft, subQuadrantTop, subQuadrantWidth, subQuadrantHeight);
        this.drawService.context.lineWidth = 6;
        this.drawService.context.strokeStyle = 'orange';
        this.drawService.context.stroke();
    }

    clueThreeQuadrant(): void {
        const randomDifferences = this.clue();
        const x = randomDifferences[0][0];
        const y = randomDifferences[0][1];
        const imageWidth = this.width;
        const imageHeight = this.height;
        const subQuadrantWidth = this.subQuadrantWidth;
        const subQuadrantHeight = this.subQuadrantHeight;

        const numSubQuadrantsX = imageWidth / subQuadrantWidth;
        const numSubQuadrantsY = imageHeight / subQuadrantHeight;

        const diffSubQuadrantX = Math.floor(x / subQuadrantWidth);
        const diffSubQuadrantY = Math.floor(y / subQuadrantHeight);

        for (let j = 0; j < numSubQuadrantsY; j++) {
            for (let i = 0; i < numSubQuadrantsX; i++) {
                const subQuadrantLeft = i * subQuadrantWidth;
                const subQuadrantTop = j * subQuadrantHeight;

                if (diffSubQuadrantX === i && diffSubQuadrantY === j) {
                    const arrowSize = 20;
                    const centerX = subQuadrantLeft + subQuadrantWidth / 2;
                    const centerY = subQuadrantTop + subQuadrantHeight / 2;
                    const diffLeft = x - subQuadrantLeft;
                    const diffTop = y - subQuadrantTop;
                    const arrowTopX = centerX - subQuadrantWidth / 2 + diffLeft;
                    const arrowTopY = centerY - subQuadrantHeight / 2 + diffTop;
                    const arrowLeftX = arrowTopX - arrowSize / 2;
                    const arrowRightX = arrowTopX + arrowSize / 2;

                    this.drawService.context.beginPath();
                    this.drawService.context.moveTo(arrowTopX, arrowTopY);
                    this.drawService.context.lineTo(arrowLeftX, arrowTopY + 10);
                    this.drawService.context.lineTo(arrowRightX, arrowTopY + 10);
                    this.drawService.context.lineTo(arrowTopX, arrowTopY);
                    this.drawService.context.closePath();
                    this.drawService.context.lineWidth = 6;
                    this.drawService.context.strokeStyle = 'red';
                    this.drawService.context.stroke();
                }
            }
        }
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
        if (this.drawService.error.show || this.drawService.isWaiting || this.hero.isOver) {
            return;
        }
        if (event.button === MouseButton.Left) {
            this.mousePosition = { x: event.offsetX, y: event.offsetY };
            this.drawService.isWaiting = true;
            this.socketService.send(this.isTimeLimited ? 'validate-coords-tl' : 'validate-coords', {
                x: this.mousePosition.x,
                y: this.mousePosition.y,
                found: this.found,
            });
        }
    }

    getWinner(): string | null {
        if (!this.hero.isOver) {
            return null;
        }
        if (this.hero.multiplayer) {
            if (this.hero.differencesFound1 > this.hero.differencesFound2) {
                return this.getPlayerName(PlayerIndex.Player1);
            } else if (this.hero.differencesFound1 < this.hero.differencesFound2) {
                return this.getPlayerName(PlayerIndex.Player2);
            } else {
                return null;
            }
        } else {
            return this.getPlayerName(PlayerIndex.Player1);
        }
    }

    ngOnDestroy() {
        window.removeEventListener('keyup', this.detectKeyPress);
        if (this.socketService) this.socketService.off(this.isTimeLimited ? 'validate-coords-tl' : 'validate-coords', this.validateCoords);
        this.blinkSubscription.unsubscribe();
        this.resetSubscription.unsubscribe();
        this.drawErrorSubscription.unsubscribe();
        this.replayService.ngOnDestroy();
    }
}
