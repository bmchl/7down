import { Injectable } from '@angular/core';
import { Vec2 } from '@app/interfaces/vec2';
import { CONSTS } from './../../../../common/consts';

const DEFAULT_WIDTH = CONSTS.DEFAULT_WIDTH_DRAW;
const DEFAULT_HEIGHT = CONSTS.DEFAULT_HEIGHT_DRAW;

@Injectable({
    providedIn: 'root',
})
export class DrawService {
    error = { x: 0, y: 0, show: false };
    correctSound = new Audio('./assets/videos/Correct_Answer_Sound_effect.mp3');
    wrongSound = new Audio('./assets/videos/Wrong_Answer_Sound_effect.mp3');
    isWaiting = false;
    context: CanvasRenderingContext2D;
    context1: CanvasRenderingContext2D;
    private canvasSize: Vec2 = { x: DEFAULT_WIDTH, y: DEFAULT_HEIGHT };

    get width(): number {
        return this.canvasSize.x;
    }

    get height(): number {
        return this.canvasSize.y;
    }

    drawDifference(): void {
        this.correctSound.play();
    }

    drawError(x: number, y: number): void {
        this.wrongSound.play();

        this.error.x = x + 5;
        this.error.y = y + 5;
        this.error.show = true;
        setTimeout(() => {
            this.error.show = false;
            this.isWaiting = false;
        }, 1000);
    }
}
