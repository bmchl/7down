import { Injectable } from '@angular/core';
import { Tools } from '@app/interfaces/tools';

import { CONSTS } from './../../../../common/consts';

const DEFAULT_WIDTH = CONSTS.DEFAULT_WIDTH;
const DEFAULT_HEIGHT = CONSTS.DEFAULT_HEIGHT;

export interface Coordinates {
    x: number;
    y: number;
}

interface State {
    leftImageData: ImageData;
    rightImageData: ImageData;
}

@Injectable({
    providedIn: 'root',
})
export class ToolsService {
    tool: Tools = Tools.None;

    pencilRadius: number = 1;
    eraserRadius: number = 1;
    ovalRadius: number = 1;
    color0: string = '#000';
    color1: string = '#000';
    color2: string = '#000';
    pencilColor: string = 'primary';
    eraserColor: string = 'primary';
    rectangleColor: string = 'primary';
    ovalColor: string = 'primary';

    isShift: boolean = false;

    currentCanvas: HTMLCanvasElement;
    currentContext: CanvasRenderingContext2D;
    bottomContext: CanvasRenderingContext2D;

    leftCanvas: HTMLCanvasElement;
    rightCanvas: HTMLCanvasElement;
    leftContext: CanvasRenderingContext2D;
    rightContext: CanvasRenderingContext2D;

    states: State[] = [
        {
            leftImageData: new ImageData(DEFAULT_WIDTH, DEFAULT_HEIGHT),
            rightImageData: new ImageData(DEFAULT_WIDTH, DEFAULT_HEIGHT),
        },
    ];
    statesPos: number = 0;

    isDrawing: boolean = false;
    currentCoordinates: Coordinates = { x: 0, y: 0 };
    previousCoordinates: Coordinates = { x: 0, y: 0 };

    startDrawing(event: MouseEvent): void {
        if (this.tool === Tools.None) return;
        this.isDrawing = true;
        this.currentCanvas = event.target as HTMLCanvasElement;
        this.currentContext = (event.target as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
        this.bottomContext = (this.currentCanvas.nextElementSibling as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D;
        this.previousCoordinates = this.getCoordinates(event);
        if (this.tool === Tools.Eraser) {
            this.bottomContext.clearRect(
                this.previousCoordinates.x - this.eraserRadius,
                this.previousCoordinates.y - this.eraserRadius,
                this.eraserRadius * 2,
                this.eraserRadius * 2,
            );
        }
    }

    moveSquare = (xAffected: boolean) => {
        const deltaX = this.currentCoordinates.x - this.previousCoordinates.x;
        const deltaY = this.currentCoordinates.y - this.previousCoordinates.y;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        const delta = absDeltaX < absDeltaY ? absDeltaX : absDeltaY;
        if (deltaX > 0 && deltaY > 0) {
            return delta;
        } else if (deltaX < 0 && deltaY > 0) {
            return xAffected ? -delta : delta;
        } else if (deltaX < 0 && deltaY < 0) {
            return -delta;
        } else if (deltaX > 0 && deltaY < 0) {
            return xAffected ? delta : -delta;
        }
        return delta;
    };

    moveCercle = (xAffected: boolean) => {
        const deltaX = this.currentCoordinates.x - this.previousCoordinates.x;
        const deltaY = this.currentCoordinates.y - this.previousCoordinates.y;
        const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (deltaX >= 0 && deltaY >= 0) {
            return radius;
        } else if (deltaX < 0 && deltaY >= 0) {
            return xAffected ? -radius : radius;
        } else if (deltaX < 0 && deltaY < 0) {
            return -radius;
        } else if (deltaX >= 0 && deltaY < 0) {
            return xAffected ? radius : -radius;
        }
        return radius;
    };

    draw(event: MouseEvent): void {
        if (!this.isDrawing || event.target !== this.currentCanvas) return;
        this.currentCoordinates = this.getCoordinates(event);

        switch (this.tool) {
            case Tools.Oval:
                this.currentContext.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
                this.drawOval(
                    this.previousCoordinates.x,
                    this.previousCoordinates.y,
                    this.isShift ? this.moveCercle(true) : this.currentCoordinates.x - this.previousCoordinates.x,
                    this.isShift ? this.moveCercle(false) : this.currentCoordinates.y - this.previousCoordinates.y,
                );
                break;
            case Tools.Pencil:
                this.currentContext.lineWidth = this.pencilRadius;
                this.currentContext.strokeStyle = this.color0;
                this.currentContext.beginPath();
                this.currentContext.moveTo(this.previousCoordinates.x, this.previousCoordinates.y);
                this.currentContext.lineTo(this.currentCoordinates.x, this.currentCoordinates.y);
                this.currentContext.stroke();
                this.previousCoordinates = this.currentCoordinates;
                break;
            case Tools.Eraser:
                this.bottomContext.clearRect(
                    this.currentCoordinates.x - this.eraserRadius,
                    this.currentCoordinates.y - this.eraserRadius,
                    this.eraserRadius * 2,
                    this.eraserRadius * 2,
                );
                break;
            case Tools.Rectangle:
                this.currentContext.fillStyle = this.color1;
                this.currentContext.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
                this.currentContext.fillRect(
                    this.previousCoordinates.x,
                    this.previousCoordinates.y,
                    this.isShift ? this.moveSquare(true) : this.currentCoordinates.x - this.previousCoordinates.x,
                    this.isShift ? this.moveSquare(false) : this.currentCoordinates.y - this.previousCoordinates.y,
                );
                break;
        }
    }

    private drawOval(startX: number, startY: number, width: number, height: number): void {
        const radiusX = Math.abs(width) / 2;
        const radiusY = Math.abs(height) / 2;
        const centerX = startX + width / 2;
        const centerY = startY + height / 2;

        this.currentContext.fillStyle = this.color2;
        this.currentContext.beginPath();
        this.currentContext.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        // this.currentContext.stroke();
        this.currentContext.fill();
        this.currentContext.closePath();
    }

    endDrawing(): void {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        this.bottomContext.drawImage(this.currentCanvas, 0, 0);
        this.currentContext.clearRect(0, 0, this.currentCanvas.width, this.currentCanvas.height);
        this.saveState();
    }

    enterArea(event: MouseEvent): void {
        this.previousCoordinates = this.getCoordinates(event);
        if (Tools.Rectangle === this.tool) this.endDrawing();
    }

    getCoordinates(event: MouseEvent): Coordinates {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return { x, y };
    }

    buttonColorChange(button: string): void {
        switch (button) {
            case 'pencil':
                this.tool = this.pencilColor === 'primary' ? Tools.Pencil : Tools.None;
                this.pencilColor = this.pencilColor === 'primary' ? 'warn' : 'primary';
                break;
            case 'eraser':
                this.tool = this.eraserColor === 'primary' ? Tools.Eraser : Tools.None;
                this.eraserColor = this.eraserColor === 'primary' ? 'warn' : 'primary';
                break;
            case 'rectangle':
                this.tool = this.rectangleColor === 'primary' ? Tools.Rectangle : Tools.None;
                this.rectangleColor = this.rectangleColor === 'primary' ? 'warn' : 'primary';
                break;
            case 'oval':
                this.tool = this.ovalColor === 'primary' ? Tools.Oval : Tools.None;
                this.ovalColor = this.ovalColor === 'primary' ? 'warn' : 'primary';
                break;
            default:
                this.tool = Tools.None;
                break;
        }
    }

    switchButton(button: string): void {
        if (button !== 'pencil') {
            this.pencilColor = 'primary';
        }
        if (button !== 'eraser') {
            this.eraserColor = 'primary';
        }
        if (button !== 'rectangle') {
            this.rectangleColor = 'primary';
        }
        if (button !== 'oval') {
            this.ovalColor = 'primary';
        }
    }

    pencilInitialize(): void {
        this.switchButton('pencil');
        this.buttonColorChange('pencil');
    }

    eraserInitialize(): void {
        this.switchButton('eraser');
        this.buttonColorChange('eraser');
    }

    rectangleInitialize(): void {
        this.switchButton('rectangle');
        this.buttonColorChange('rectangle');
    }

    ovalInitialize(): void {
        this.switchButton('oval');
        this.buttonColorChange('oval');
    }

    swapContexts(): void {
        const temp = this.leftContext.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        this.leftContext.putImageData(this.rightContext.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT), 0, 0);
        this.rightContext.putImageData(temp, 0, 0);
        this.saveState();
    }

    resetContext(side: string, save: boolean): void {
        if (side === 'left') {
            this.leftContext.clearRect(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        } else {
            this.rightContext.clearRect(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT);
        }
        if (save) this.saveState();
    }

    duplicateContext(side: string): void {
        if (side === 'left') {
            this.rightContext.putImageData(this.leftContext.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT), 0, 0);
        } else {
            this.leftContext.putImageData(this.rightContext.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT), 0, 0);
        }
        this.saveState();
    }

    saveState(): void {
        if (this.statesPos < this.states.length - 1) this.states.splice(this.statesPos + 1, this.states.length - this.statesPos);
        this.states.push({
            leftImageData: this.leftContext.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT),
            rightImageData: this.rightContext.getImageData(0, 0, DEFAULT_WIDTH, DEFAULT_HEIGHT),
        });
        this.statesPos++;
    }

    undo(): void {
        this.statesPos--;
        this.rerender();
    }

    redo(): void {
        this.statesPos++;
        this.rerender();
    }

    rerender(): void {
        this.leftContext.putImageData(this.states[this.statesPos].leftImageData, 0, 0);
        this.rightContext.putImageData(this.states[this.statesPos].rightImageData, 0, 0);
    }
}
