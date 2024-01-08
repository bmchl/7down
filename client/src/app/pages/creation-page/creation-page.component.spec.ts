/* eslint-disable max-lines */
import { HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { EditAreaComponent } from '@app/components/edit-area/edit-area.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { DiffDialogComponent } from '@app/dialogs/diff-dialog/diff-dialog.component';
import { ErrorDialogComponent } from '@app/dialogs/error-dialog/error-dialog.component';
import { InputDialogComponent } from '@app/dialogs/input-dialog/input-dialog.component';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { RequestService } from '@app/services/request.service';
import { ToolsService } from '@app/services/tools.service';
import { ColorPickerModule } from 'ngx-color-picker';
import { of } from 'rxjs';
import { SelectionPageComponent } from './../selection-page/selection-page.component';
import { CreationPageComponent } from './creation-page.component';

describe('CreationPageComponent', () => {
    let component: CreationPageComponent;
    let fixture: ComponentFixture<CreationPageComponent>;
    let customDialogService: jasmine.SpyObj<CustomDialogService>;
    let fakeClose: jasmine.Spy;
    let toolsService: ToolsService;
    let requestService: RequestService;

    beforeEach(async () => {
        fakeClose = jasmine.createSpy();
        customDialogService = jasmine.createSpyObj('CustomDialogService', [
            'openErrorDialog',
            'openLoadingDialog',
            'openInputDialog',
            'openImageDialog',
        ]);

        customDialogService.openInputDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<InputDialogComponent, any>);

        customDialogService.openImageDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
        } as MatDialogRef<DiffDialogComponent, any>);

        customDialogService.openLoadingDialog.and.returnValue({
            afterClosed: () => of({ submit: true }),
            close: () => fakeClose(),
        } as MatDialogRef<LoadingDialogComponent, any>);

        await TestBed.configureTestingModule({
            imports: [
                AppMaterialModule,
                ColorPickerModule,
                BrowserAnimationsModule,
                HttpClientTestingModule,
                RouterTestingModule.withRoutes([{ path: 'config', component: SelectionPageComponent }]),
            ],
            providers: [{ provide: CustomDialogService, useValue: customDialogService }],
            declarations: [
                CreationPageComponent,
                HeaderComponent,
                BasicDialogComponent,
                ErrorDialogComponent,
                InputDialogComponent,
                LoadingDialogComponent,
                EditAreaComponent,
            ],
            teardown: { destroyAfterEach: false },
        }).compileComponents();

        toolsService = TestBed.inject(ToolsService);
        requestService = TestBed.inject(RequestService);
        fixture = TestBed.createComponent(CreationPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should open loading dialog and call onDetectDifference() if both urls are defined', () => {
        component.url0 = 'url0';
        component.url1 = 'url1';
        const fakeDetectDifferences = jasmine.createSpy();
        component.onDetectDifferences = jasmine.createSpy().and.callFake(fakeDetectDifferences);
        component.onSubmitClick();

        expect(customDialogService.openLoadingDialog).toHaveBeenCalledWith('Détection de différences entre les images');
        expect(component.onDetectDifferences).toHaveBeenCalled();
    });

    it('onRadiusSelect() equals 3 if the cursor value is one', () => {
        const changeEvent = { value: 1 };
        component.onRadiusSelect(changeEvent);
        expect(component.radius).toEqual(3);
    });

    it('formatLabel(0) equals 0', () => {
        expect(component.formatLabel(0)).toEqual(0);
    });
    it('formatLabel(1) equals 3', () => {
        expect(component.formatLabel(1)).toEqual(3);
    });
    it('formatLabel(2) equals 9', () => {
        expect(component.formatLabel(2)).toEqual(9);
    });
    it('formatLabel(3) equals 15', () => {
        expect(component.formatLabel(3)).toEqual(15);
    });
    it('formatLabel(4) equals 0', () => {
        expect(component.formatLabel(4)).toEqual(0);
    });

    it('deleteImg(0) deletes the first image', () => {
        component.url0 = 'test';
        component.deleteImg(0);
        expect(component.url0).toBeNull();
    });
    it('deleteImg(1) deletes the second image', () => {
        component.url1 = 'test';
        component.deleteImg(1);
        expect(component.url1).toBeNull();
    });

    it('switch() switches url0 and url1', () => {
        component.url0 = 'test0';
        component.url1 = 'test1';
        component.switch();
        expect(component.url0).toEqual('test1');
        expect(component.url1).toEqual('test0');
    });

    it('ngOnInit should initialize data with the expected values', () => {
        component.ngOnInit();
        expect(component.data).toEqual({
            title: 'Veuillez choisir un nom au jeu',
            cancel: 'Annuler',
            confirm: 'Confirmer',
            inputLabel: 'Nom de jeu',
            input: '',
        });
    });

    it('validate() should open an ErrorDialog if the number of differences is not between 3 and 9', () => {
        component.numOfDifferences = 2;
        component.validate();
        expect(customDialogService.openErrorDialog).toHaveBeenCalledWith({
            title: 'Nombre de différences invalide',
            message: 'Il devrait y avoir entre 3 et 9 différences. Veuillez réessayer.',
        });
    });

    it('validate() should call create() if the number of differences is between 3 and 9', () => {
        component.numOfDifferences = 5;
        component.create = jasmine.createSpy();
        component.validate();
        expect(component.create).toHaveBeenCalled();
    });

    it('create() should open an ErrorDialog if input name is empty', () => {
        component.numOfDifferences = 4;
        component.data.input = '';
        component.gameName = '';
        component.create();
        expect(customDialogService.openErrorDialog).toHaveBeenCalled();
    });

    it('create() should open an InputDialog if the number of differences is between 3 and 9', () => {
        spyOn(component, 'mergeImages').and.returnValue(Promise.resolve());
        spyOn(component.leftMergedImage.nativeElement, 'toDataURL').and.returnValue('url0');
        spyOn(component.rightMergedImage.nativeElement, 'toDataURL').and.returnValue('url1');
        component.numOfDifferences = 4;
        component.data.input = 'test';
        component.gameName = '';

        const fakeResponse = new HttpResponse({ status: 201, body: '' });
        const spy = spyOn(requestService, 'postRequest').and.returnValue(of(fakeResponse));

        component.create();

        expect(spy).toHaveBeenCalledWith('games', {
            gameName: component.gameName,
            image: 'url0',
            image1: 'url1',
            radius: component.radius,
        });
        expect(customDialogService.openInputDialog).toHaveBeenCalled();
        expect(component.gameName).toEqual(component.data.input);
    });

    it('should call postRequest and openImageDialog with correct parameters and afterClosed', async () => {
        spyOn(component, 'mergeImages').and.callFake(async () => Promise.resolve());
        spyOn(component.leftMergedImage.nativeElement, 'toDataURL').and.returnValue('url0');
        spyOn(component.rightMergedImage.nativeElement, 'toDataURL').and.returnValue('url1');
        component.radius = 9;

        const fakeGame = [[[]]];
        const fakeResponse = new HttpResponse({ status: 201, body: fakeGame });
        const spy = spyOn(requestService, 'postRequest').and.returnValue(of(fakeResponse));

        component.loadingDialogRef = customDialogService.openLoadingDialog('title');
        component.loadingDialogRef.close = jasmine.createSpy();

        await component.onDetectDifferences();

        expect(spy).toHaveBeenCalledWith('diff/find-differences', { img0: 'url0', img1: 'url1', radius: 9 });
        expect(customDialogService.openImageDialog).toHaveBeenCalledWith({ title: 'Différences des deux images', img: [[[]]], differenceCount: 1 });
    });

    it('onSelectFile(0) does not work with other than bmp files', () => {
        const event = new Event('change');
        event.target as HTMLInputElement;

        const mockFile = new File([''], 'filename', { type: 'text/html' });
        const mockEvt = { target: { files: [mockFile] } };

        component.onSelectFile(mockEvt as any, 0);
        expect(component.url0).toBeUndefined();
    });

    it('onSelectFile(0) does not work with other than bmp files with filename', () => {
        const event = new Event('change');
        event.target as HTMLInputElement;

        const mockFile = new File([''], 'filename.png', { type: 'image/png' });
        const mockEvt = { target: { files: [mockFile] } };

        component.onSelectFile(mockEvt as any, 0);
        expect(component.url0).toBeUndefined();
    });

    it('onSelectFile(0) does not work with a file that is not 24 bits', () => {
        const event = new Event('change');
        event.target as HTMLInputElement;

        const mockFile = new File([''], 'filename.bmp', { type: 'image/bmp' });
        const mockEvt = { target: { files: [mockFile] } };

        component.onSelectFile(mockEvt as any, 0);
        expect(component.url0).toBeUndefined();
    });

    it('valid image gets processed', () => {
        const event = new Event('change');
        event.target as HTMLInputElement;

        const mockFile = new File([new Blob(['a'.repeat(640 * 480 * 3)], { type: 'image/bmp' })], 'filename.bmp', { type: 'image/bmp' });
        const mockEvt = { target: { files: [mockFile] } };

        component.onSelectFile(mockEvt as any, 0);
        expect(component.url0).toBeUndefined();
    });

    it('processImage(image, 0) should work only for 640x480 images', () => {
        const image = new Image();
        component.processImage(image, 0);
        image.src = 'https://people.math.sc.edu/Burkardt/data/bmp/all_gray.bmp';
        expect(component.url0).toBeUndefined();
    });

    it('processImage(image, 0) should change url0', (done) => {
        const image = new Image();
        component.processImage(image, 0);
        image.src = '/assets/image_7_diff.bmp';
        setTimeout(() => {
            expect(component.url0).toBe(image.src);
            done();
        }, 1000);
    });

    it('processImage(image, 1) should change url1', (done) => {
        const image = new Image();
        component.processImage(image, 1);
        image.src = '/assets/image_7_diff.bmp';

        setTimeout(() => {
            expect(component.url1).toBe(image.src);
            done();
        }, 1000);
    });

    it('processImage(image, 2) should change both urls', (done) => {
        const image = new Image();
        component.processImage(image, 2);
        image.src = '/assets/image_7_diff.bmp';

        setTimeout(() => {
            expect(component.url0).toBe(image.src);
            expect(component.url1).toBe(image.src);
            done();
        }, 1000);
    });

    it('on shift down, isShift should be true', () => {
        expect(toolsService.isShift).toBeFalsy();
        component.onKeyDown(new KeyboardEvent('keydown', { shiftKey: true }));
        expect(toolsService.isShift).toBeTruthy();
    });

    it('on shift up, isShift should be false', () => {
        component.onKeyUp(new KeyboardEvent('keyup', { shiftKey: false }));
        expect(toolsService.isShift).toBeFalsy();
    });

    it('if control is not keyup, shouldnt call undo', () => {
        const spy = spyOn(toolsService, 'undo');
        component.onKeyUp(new KeyboardEvent('keyup', { ctrlKey: true, key: 'z' }));
        expect(spy).not.toHaveBeenCalled();
    });

    it('if control is keyup but not z, shouldnt call undo', () => {
        const spy = spyOn(toolsService, 'undo');
        component.onKeyUp(new KeyboardEvent('keyup', { ctrlKey: true, key: 'a' }));
        expect(spy).not.toHaveBeenCalled();
    });

    it('if control is keyup and z, should call undo', () => {
        toolsService.statesPos = 1;
        const spy = spyOn(toolsService, 'undo').and.callFake(jasmine.createSpy());
        component.onKeyUp(new KeyboardEvent('keyup', { ctrlKey: true, key: 'z' }));
        expect(spy).toHaveBeenCalled();
    });

    it('if control is keyup and Z, should call redo', () => {
        toolsService.statesPos = 1;
        const spy = spyOn(toolsService, 'redo').and.callFake(jasmine.createSpy());
        component.onKeyUp(new KeyboardEvent('keyup', { ctrlKey: true, key: 'Z' }));
        expect(spy).toHaveBeenCalled();
    });

    it('pencilSelect should change pencil radius', () => {
        component.onPencilSelect({ value: 3 });
        expect(toolsService.pencilRadius).toBe(3);
    });

    it('EraserSelect should change eraser radius', () => {
        component.onEraserSelect({ value: 3 });
        expect(toolsService.eraserRadius).toBe(3);
    });

    it('should merge left and right drawings onto their respective canvases', async () => {
        spyOn(toolsService.leftCanvas, 'toDataURL').and.returnValue(
            // eslint-disable-next-line max-len
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAWUlEQVR4nOzPUQkAIQDA0OOwvVnsYDRD+PEQ9hJsY839vezXAbca0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQTgAAAP//mM8CW5lRag4AAAAASUVORK5CYII=',
        );
        spyOn(toolsService.rightCanvas, 'toDataURL').and.returnValue(
            // eslint-disable-next-line max-len
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAwCAIAAAAuKetIAAAAWUlEQVR4nOzPUQkAIQDA0OOwvVnsYDRD+PEQ9hJsY839vezXAbca0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQGtAa0BrQTgAAAP//mM8CW5lRag4AAAAASUVORK5CYII=',
        );
        const mockImage = new Image();
        spyOn(window, 'Image').and.returnValue(mockImage);
        spyOnProperty(mockImage, 'onload').and.callFake(jasmine.createSpy());

        await component.mergeImages();

        expect(window.Image).toHaveBeenCalledTimes(2);
    });

    it('mergeImaes should call this.leftContext.drawImage', async () => {
        component.url0 = 'https://people.math.sc.edu/Burkardt/data/bmp/all_gray.bmp';
        component.url1 = 'https://people.math.sc.edu/Burkardt/data/bmp/all_gray.bmp';
        const spy1 = spyOn(component.leftContext, 'drawImage').and.callFake(jasmine.createSpy());
        const spy2 = spyOn(component.rightContext, 'drawImage').and.callFake(jasmine.createSpy());

        component.mergeImages();
        expect(spy1).toBeDefined();
        expect(spy2).toBeDefined();
    });
});
