import { TestBed } from '@angular/core/testing';
import { CanvasTestHelper } from '@app/classes/canvas-test-helper';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { DrawService } from '@app/services/draw.service';

describe('DrawService', () => {
    let service: DrawService;
    let ctxStub: CanvasRenderingContext2D;

    const CANVAS_WIDTH = 500;
    const CANVAS_HEIGHT = 500;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [BasicDialogComponent],
            imports: [AppMaterialModule],
        }).compileComponents();
        service = TestBed.inject(DrawService);
        ctxStub = CanvasTestHelper.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT).getContext('2d') as CanvasRenderingContext2D;
        service.context = ctxStub;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it(' width should return the width of the grid canvas', () => {
        expect(service.width).toEqual(CANVAS_WIDTH);
    });

    it(' height should return the height of the grid canvas', () => {
        expect(service.height).toEqual(CANVAS_HEIGHT);
    });

    it('drawDifference should call this.correctSound.play()', () => {
        spyOn(service.correctSound, 'play').and.callFake(jasmine.createSpy());
        service.drawDifference();
        expect(service.correctSound.play).toHaveBeenCalled();
    });

    it('drawError() should draw a red cross at the event position and play the wrong answer sound', (done) => {
        const event = {
            offsetX: 10,
            offsetY: 20,
        } as MouseEvent;

        spyOn(service.wrongSound, 'play').and.callFake(jasmine.createSpy());
        service.drawError(event.offsetX, event.offsetY);

        expect(service.error.x).toEqual(event.offsetX + 5);
        expect(service.error.y).toEqual(event.offsetY + 5);
        expect(service.error.show).toBeTrue();

        setTimeout(() => {
            expect(service.error.show).toBeFalsy();
            done();
        }, 1200);
    });
});
