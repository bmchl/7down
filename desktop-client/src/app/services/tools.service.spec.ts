import { TestBed } from '@angular/core/testing';
import { Tools } from '@app/interfaces/tools';
import { CONSTS } from '@common/consts';
import { ToolsService } from './tools.service';

describe('ToolsService', () => {
    let service: ToolsService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToolsService);
        service.leftContext = jasmine.createSpyObj('leftContext', ['getImageData', 'putImageData', 'clearRect']);
        service.rightContext = jasmine.createSpyObj('rightContext', ['getImageData', 'putImageData', 'clearRect']);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return when no tools are selected', () => {
        service.startDrawing(new MouseEvent('mousedown'));
        expect(service.isDrawing).toBeFalsy();
    });

    it('should be drawing when startDrawing', () => {
        service.tool = Tools.Eraser;
        service.startDrawing({
            target: {
                getContext: () => ({}),
                getBoundingClientRect: () => ({ left: 0, top: 0 }),
                nextElementSibling: {
                    getContext: () => ({
                        clearRect: () => ({}),
                    }),
                },
            },
            clientX: 0,
            clientY: 0,
        } as any);
        expect(service.isDrawing).toBeTruthy();
    });

    it('should set isDrawing to false when endDrawing', () => {
        service.isDrawing = true;
        service.bottomContext = jasmine.createSpyObj('bottomContext', ['drawImage']);
        service.currentContext = jasmine.createSpyObj('currentContext', ['clearRect']);
        service.currentCanvas = jasmine.createSpyObj('currentCanvas', ['width', 'height']);
        const spy = spyOn(service, 'saveState').and.callFake(jasmine.createSpy());
        service.endDrawing();
        expect(spy).toHaveBeenCalled();
    });
    it('should return if isDrawing is false', () => {
        service.isDrawing = false;
        service.bottomContext = jasmine.createSpyObj('bottomContext', ['drawImage']);
        service.currentContext = jasmine.createSpyObj('currentContext', ['clearRect']);
        service.currentCanvas = jasmine.createSpyObj('currentCanvas', ['width', 'height']);
        const spy = spyOn(service, 'saveState').and.callFake(jasmine.createSpy());
        service.endDrawing();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should set pencil as current tool', () => {
        service.pencilInitialize();
        expect(service.tool).toBe(Tools.Pencil);
    });

    it('should set none as current tool if pencil is selected', () => {
        service.pencilColor = 'test';
        service.pencilInitialize();
        expect(service.tool).toBe(Tools.None);
    });

    it('should set none as current tool if Eraser is selected', () => {
        service.eraserColor = 'test';
        service.eraserInitialize();
        expect(service.tool).toBe(Tools.None);
    });

    it('should set none as current tool if rectangle is selected', () => {
        service.rectangleColor = 'test';
        service.rectangleInitialize();
        expect(service.tool).toBe(Tools.None);
    });

    it('should set eraser as current tool', () => {
        service.eraserInitialize();
        expect(service.tool).toBe(Tools.Eraser);
    });

    it('should set rectangle as current tool', () => {
        service.rectangleInitialize();
        expect(service.tool).toBe(Tools.Rectangle);
    });

    it('should swap contexts', () => {
        service.swapContexts();
        expect(service.leftContext.getImageData).toHaveBeenCalled();
        expect(service.rightContext.getImageData).toHaveBeenCalled();
    });

    it('should reset left contexts', () => {
        const spy = spyOn(service, 'saveState').and.callFake(jasmine.createSpy());
        service.resetContext('left', true);
        expect(service.leftContext.clearRect).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();
    });

    it('should reset right contexts', () => {
        const spy = spyOn(service, 'saveState').and.callFake(jasmine.createSpy());
        service.resetContext('right', true);
        expect(service.rightContext.clearRect).toHaveBeenCalled();
        expect(spy).toHaveBeenCalled();
    });

    it('should duplicate left context to right context', () => {
        service.duplicateContext('left');
        expect(service.leftContext.getImageData).toHaveBeenCalled();
        expect(service.rightContext.putImageData).toHaveBeenCalled();
    });

    it('should duplicate right context to left context', () => {
        service.duplicateContext('right');
        expect(service.rightContext.getImageData).toHaveBeenCalled();
        expect(service.leftContext.putImageData).toHaveBeenCalled();
    });

    it('should splice when an action is done on a previous state', () => {
        service.states = [
            {
                leftImageData: new ImageData(CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT),
                rightImageData: new ImageData(CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT),
            },
            {
                leftImageData: new ImageData(CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT),
                rightImageData: new ImageData(CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT),
            },
            {
                leftImageData: new ImageData(CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT),
                rightImageData: new ImageData(CONSTS.DEFAULT_WIDTH, CONSTS.DEFAULT_HEIGHT),
            },
        ];
        service.saveState();
        expect(service.states.length).toBe(2);
    });

    it('should decrease the state position', () => {
        service.statesPos = 1;
        service.undo();
        expect(service.statesPos).toBe(0);
    });

    it('should increase the state position', () => {
        service.statesPos = -1;
        service.redo();
        expect(service.statesPos).toBe(0);
    });

    it('should return when is not drawing', () => {
        service.currentCoordinates = { x: 0, y: 0 };
        service.draw({
            target: {
                getContext: () => ({}),
                getBoundingClientRect: { left: 0, top: 0 },
                nextElementSibling: {
                    getContext: () => ({}),
                },
            },
            clientX: 50,
            clientY: 50,
        } as any);
        expect(service.currentCoordinates).toEqual({ x: 0, y: 0 });
    });

    it('should draw when pencil selected', () => {
        service.isDrawing = true;
        service.currentCanvas = jasmine.createSpyObj('currentCanvas', {
            width: () => 640,
            height: () => 480,
            getContext: () => ({}),
            getBoundingClientRect: { left: 0, top: 0 },
            nextElementSibling: {
                getContext: () => ({}),
            },
        });
        service.tool = Tools.Pencil;
        service.currentContext = jasmine.createSpyObj('currentContext', ['beginPath', 'moveTo', 'lineTo', 'stroke']);
        service.draw({
            target: service.currentCanvas,
            clientX: 0,
            clientY: 0,
        } as any);
        expect(service.currentContext.beginPath).toHaveBeenCalled();
    });

    it('should erase when eraser selected', () => {
        service.isDrawing = true;
        service.currentCanvas = jasmine.createSpyObj('currentCanvas', {
            width: () => 640,
            height: () => 480,
            getContext: () => ({}),
            getBoundingClientRect: { left: 0, top: 0 },
            nextElementSibling: {
                getContext: () => ({}),
            },
        });
        service.tool = Tools.Eraser;
        service.bottomContext = jasmine.createSpyObj('bottomContext', ['clearRect']);
        service.draw({
            target: service.currentCanvas,
            clientX: 0,
            clientY: 0,
        } as any);
        expect(service.bottomContext.clearRect).toHaveBeenCalled();
    });

    it('should rectangle when rectangle selected', () => {
        service.isDrawing = true;
        service.currentCanvas = jasmine.createSpyObj('currentCanvas', {
            width: () => 640,
            height: () => 480,
            getContext: () => ({}),
            getBoundingClientRect: { left: 0, top: 0 },
            nextElementSibling: {
                getContext: () => ({}),
            },
        });
        service.tool = Tools.Rectangle;
        service.currentContext = jasmine.createSpyObj('bottomContext', ['clearRect', 'fillRect']);
        service.draw({
            target: service.currentCanvas,
            clientX: 40,
            clientY: 50,
        } as any);
        expect(service.currentContext.fillRect).toHaveBeenCalledWith(0, 0, 40, 50);
    });

    it('should square when rectangle selected and shift held', () => {
        service.isDrawing = true;
        service.isShift = true;
        service.previousCoordinates = { x: 25, y: 20 };
        service.currentCanvas = jasmine.createSpyObj('currentCanvas', {
            width: () => 640,
            height: () => 480,
            getContext: () => ({}),
            getBoundingClientRect: { left: 0, top: 0 },
            nextElementSibling: {
                getContext: () => ({}),
            },
        });
        service.tool = Tools.Rectangle;
        service.currentContext = jasmine.createSpyObj('bottomContext', ['clearRect', 'fillRect']);
        service.draw({
            target: service.currentCanvas,
            clientX: 40,
            clientY: 50,
        } as any);
        expect(service.currentContext.fillRect).toHaveBeenCalledWith(25, 20, 15, 15);
    });

    it('should set this.tool to Tools.None by default', () => {
        service.buttonColorChange('default');
        expect(service.tool).toBe(Tools.None);
    });

    it('should set the previous cord to new cords on enterArea', () => {
        service.enterArea({
            target: {
                getContext: () => ({}),
                getBoundingClientRect: () => ({ left: 0, top: 0 }),
                nextElementSibling: {
                    getContext: () => ({
                        clearRect: () => ({}),
                    }),
                },
            },
            clientX: 10,
            clientY: 10,
        } as any);
        expect(service.previousCoordinates).toEqual({ x: 10, y: 10 });
    });

    it('should end drawing when rectangle on enterArea', () => {
        service.tool = Tools.Rectangle;
        const spy = spyOn(service, 'endDrawing').and.callFake(jasmine.createSpy());
        service.enterArea({
            target: {
                getContext: () => ({}),
                getBoundingClientRect: () => ({ left: 0, top: 0 }),
                nextElementSibling: {
                    getContext: () => ({
                        clearRect: () => ({}),
                    }),
                },
            },
            clientX: 10,
            clientY: 10,
        } as any);
        expect(spy).toHaveBeenCalled();
    });

    it('moveSquare case 1 should return correct coordinates', () => {
        service.currentCoordinates = { x: 10, y: 10 };
        service.previousCoordinates = { x: 0, y: 0 };
        service.moveSquare(true);
        service.moveSquare(false);
        expect(service.currentCoordinates).toEqual({ x: 10, y: 10 });
    });

    it('moveSquare case 2 should return correct coordinates', () => {
        service.currentCoordinates = { x: 0, y: 0 };
        service.previousCoordinates = { x: 10, y: 10 };
        service.moveSquare(true);
        service.moveSquare(false);
        expect(service.currentCoordinates).toEqual({ x: 0, y: 0 });
    });
    it('moveSquare case 3 should return correct coordinates', () => {
        service.currentCoordinates = { x: 0, y: 10 };
        service.previousCoordinates = { x: 0, y: 10 };
        service.moveSquare(true);
        service.moveSquare(false);
        expect(service.currentCoordinates).toEqual({ x: 0, y: 10 });
    });

    it('moveSquare case 4 should return correct coordinates', () => {
        service.currentCoordinates = { x: 10, y: 0 };
        service.previousCoordinates = { x: 0, y: 10 };
        service.moveSquare(true);
        service.moveSquare(false);
        expect(service.currentCoordinates).toEqual({ x: 10, y: 0 });
    });

    it('moveSquare case 5 should return correct coordinates', () => {
        service.currentCoordinates = { x: 0, y: 10 };
        service.previousCoordinates = { x: 10, y: 0 };
        service.moveSquare(true);
        service.moveSquare(false);
        expect(service.currentCoordinates).toEqual({ x: 0, y: 10 });
    });
});
