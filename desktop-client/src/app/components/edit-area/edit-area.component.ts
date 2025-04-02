import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ToolsService } from '@app/services/tools.service';

@Component({
    selector: 'app-edit-area',
    templateUrl: './edit-area.component.html',
    styleUrls: ['./edit-area.component.scss'],
})
export class EditAreaComponent implements AfterViewInit {
    @Input() side: string;
    @ViewChild('canvas', { static: false }) private topCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvas1', { static: false }) private bottomCanvas!: ElementRef<HTMLCanvasElement>;

    private topContext: CanvasRenderingContext2D;
    private bottomContext: CanvasRenderingContext2D;

    constructor(public toolsService: ToolsService) {}

    ngAfterViewInit(): void {
        this.topContext = this.topCanvas.nativeElement.getContext('2d') as CanvasRenderingContext2D;
        this.bottomContext = this.bottomCanvas.nativeElement.getContext('2d') as CanvasRenderingContext2D;

        if (this.side === 'left') {
            this.toolsService.leftContext = this.bottomContext;
            this.toolsService.leftCanvas = this.bottomCanvas.nativeElement;
        } else {
            this.toolsService.rightContext = this.bottomContext;
            this.toolsService.rightCanvas = this.bottomCanvas.nativeElement;
        }

        this.topContext.lineJoin = 'round';
        this.topContext.lineCap = 'round';

        this.topCanvas.nativeElement.addEventListener('mousedown', this.toolsService.startDrawing.bind(this.toolsService));
        this.topCanvas.nativeElement.addEventListener('mouseenter', this.toolsService.enterArea.bind(this.toolsService));
        this.topCanvas.nativeElement.addEventListener('mousemove', this.toolsService.draw.bind(this.toolsService));
        this.topCanvas.nativeElement.addEventListener('mouseup', this.toolsService.endDrawing.bind(this.toolsService));
    }
}
