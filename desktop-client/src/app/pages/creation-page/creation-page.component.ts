import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, Inject, NgZone, OnInit, Renderer2, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CustomInputDialogData } from '@app/dialogs/custom-dialog-data';
import { LoadingDialogComponent } from '@app/dialogs/loading-dialog/loading-dialog.component';
import { AuthService } from '@app/services/auth-service';
import { CustomDialogService } from '@app/services/custom-dialog.service';
import { ToolsService } from '@app/services/tools.service';
import { CONSTS } from '@common/consts';
import { TranslateService } from '@ngx-translate/core';
import { RequestService } from './../../services/request.service';

@Component({
    selector: 'app-creation-page',
    templateUrl: './creation-page.component.html',
    styleUrls: ['./creation-page.component.scss'],
})
export class CreationPageComponent implements OnInit, AfterViewInit {
    @ViewChild('leftMergedImage', { static: false })
    leftMergedImage!: ElementRef<HTMLCanvasElement>;
    @ViewChild('rightMergedImage', { static: false })
    rightMergedImage!: ElementRef<HTMLCanvasElement>;
    @ViewChild('leftBaseImage', { static: false })
    leftBaseImage!: ElementRef<HTMLImageElement>;
    @ViewChild('rightBaseImage', { static: false })
    rightBaseImage!: ElementRef<HTMLImageElement>;

    leftContext: CanvasRenderingContext2D;
    rightContext: CanvasRenderingContext2D;

    url0: string | ArrayBuffer | null | undefined;
    url1: string | ArrayBuffer | null | undefined;
    radius: number = 3;

    uid: string | null;

    numOfDifferences: number = 4;
    gameName: string;
    data: CustomInputDialogData;
    loadingDialogRef: MatDialogRef<LoadingDialogComponent>;
    canvas0Style: { display: string };
    canvas1Style: { display: string };
    isDarkMode: boolean = false;
    language: string;

    // NgZone parameter is required to avoid test errors
    // eslint-disable-next-line max-params
    constructor(
        private zone: NgZone,
        public router: Router,
        public request: RequestService,
        public customDialogService: CustomDialogService,
        public toolsService: ToolsService,
        public authService: AuthService,
        public translateService: TranslateService,
        private renderer: Renderer2,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent) {
        this.toolsService.isShift = event.shiftKey;
    }

    @HostListener('window:keyup', ['$event'])
    onKeyUp(event: KeyboardEvent) {
        this.toolsService.isShift = event.shiftKey;
        if (!event.ctrlKey) {
            return;
        }
        if (event.key === 'z' && this.toolsService.statesPos !== 0) {
            this.toolsService.undo();
        } else if (event.key === 'Z' && this.toolsService.statesPos !== this.toolsService.states.length - 1) {
            this.toolsService.redo();
        }
    }

    ngOnInit() {
        (async () => {
            if (!sessionStorage.getItem('user_uid')) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            this.language = await this.authService.getLanguage(this.uid);
            this.translateService.use(this.language);
        })();
        if (this.language === 'fr') {
            this.data = {
                title: 'Veuillez choisir un nom au jeu',
                cancel: 'Annuler',
                confirm: 'Confirmer',
                inputLabel: 'Nom de jeu',
                input: '',
            };
        } else {
            this.data = {
                title: 'Please choose a game name',
                cancel: 'Cancel',
                confirm: 'Confirm',
                inputLabel: 'Game name',
                input: '',
            };
        }
    }

    ngAfterViewInit(): void {
        this.leftContext = this.leftMergedImage.nativeElement.getContext('2d') as CanvasRenderingContext2D;
        this.rightContext = this.rightMergedImage.nativeElement.getContext('2d') as CanvasRenderingContext2D;
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        if (this.isDarkMode) {
            this.renderer.addClass(this.document.body, 'dark');
        } else {
            this.renderer.removeClass(this.document.body, 'dark');
        }
    }

    async mergeImages(): Promise<void> {
        const leftDrawings = new Image();
        const rightDrawings = new Image();

        const leftDrawingsPromise = new Promise((resolve, reject) => {
            leftDrawings.addEventListener('load', () => resolve(leftDrawings));
            leftDrawings.addEventListener('error', reject);
        });

        const rightDrawingsPromise = new Promise((resolve, reject) => {
            rightDrawings.addEventListener('load', () => resolve(rightDrawings));
            rightDrawings.addEventListener('error', reject);
        });

        leftDrawings.src = this.toolsService.leftCanvas.toDataURL();
        rightDrawings.src = this.toolsService.rightCanvas.toDataURL();

        await Promise.all([leftDrawingsPromise, rightDrawingsPromise]);

        if (this.url0) this.leftContext.drawImage(this.leftBaseImage.nativeElement, 0, 0);
        else {
            this.leftContext.fillStyle = '#FFF';
            this.leftContext.fillRect(0, 0, 640, 480);
        }
        this.leftContext.drawImage(leftDrawings, 0, 0);

        if (this.url1) this.rightContext.drawImage(this.rightBaseImage.nativeElement, 0, 0);
        else {
            this.rightContext.fillStyle = '#FFF';
            this.rightContext.fillRect(0, 0, 640, 480);
        }
        this.rightContext.drawImage(rightDrawings, 0, 0);
    }

    onSubmitClick(): void {
        if (this.language === 'fr') {
            this.loadingDialogRef = this.customDialogService.openLoadingDialog('Détection de différences entre les images');
        } else {
            this.loadingDialogRef = this.customDialogService.openLoadingDialog('Detecting differences between images');
        }
        this.onDetectDifferences();
    }

    async onDetectDifferences() {
        await this.mergeImages();
        const differenceObject = {
            img0: this.leftContext.canvas.toDataURL(),
            img1: this.rightContext.canvas.toDataURL(),
            radius: this.radius,
        };
        this.request.postRequest('diff/find-differences', differenceObject).subscribe((res: any) => {
            res = res.body;
            this.numOfDifferences = res.length;
            if (this.language === 'fr') {
                this.customDialogService
                    .openImageDialog({
                        title: 'Différences des deux images',
                        img: res,
                        differenceCount: res.length,
                    })
                    .afterClosed()
                    .subscribe((submit: boolean) => {
                        this.loadingDialogRef.close();
                        if (submit) {
                            this.validate();
                        }
                    });
            } else {
                this.customDialogService
                    .openImageDialog({
                        title: 'Differences between the two images',
                        img: res,
                        differenceCount: res.length,
                    })
                    .afterClosed()
                    .subscribe((submit: boolean) => {
                        this.loadingDialogRef.close();
                        if (submit) {
                            this.validate();
                        }
                    });
            }
        });
    }

    validate() {
        if (this.numOfDifferences > 9 || this.numOfDifferences < 3) {
            if (this.language === 'fr') {
                this.customDialogService.openErrorDialog({
                    title: 'Nombre de différences invalide',
                    message: 'Il devrait y avoir entre 3 et 9 différences. Veuillez réessayer.',
                });
            } else {
                this.customDialogService.openErrorDialog({
                    title: 'Invalid number of differences',
                    message: 'There should be between 3 and 9 differences. Please try again.',
                });
            }
        } else {
            this.create();
        }
    }

    create() {
        const dialogRef = this.customDialogService.openInputDialog(this.data);
        dialogRef.afterClosed().subscribe((submit: boolean) => {
            if (submit) {
                if (this.data.input.trim().length === 0) {
                    if (this.language === 'fr') {
                        this.customDialogService.openErrorDialog({
                            title: 'Nom de jeu invalide',
                            message: "Il devrait être composé d'au moins un caractère. Veuillez réessayer.",
                        });
                    } else {
                        this.customDialogService.openErrorDialog({
                            title: 'Invalid game name',
                            message: 'It should be composed of at least one character. Please try again.',
                        });
                    }
                    return;
                }
                this.loadingDialogRef = this.customDialogService.openLoadingDialog('Création du jeu dans notre base de données');
                this.gameName = this.data.input;
                this.request
                    .postRequest('games', {
                        gameName: this.gameName,
                        image: this.leftMergedImage.nativeElement.toDataURL(),
                        image1: this.rightMergedImage.nativeElement.toDataURL(),
                        radius: this.radius,
                    })
                    .subscribe(async (res: any) => {
                        if (res.status === 201) {
                            this.loadingDialogRef.close();
                            this.zone.run(() => {
                                this.router.navigate(['/config']);
                            });
                        }
                    });
            }
        });
    }

    onRadiusSelect(event: any): void {
        this.radius = this.formatLabel(event.value);
    }

    onPencilSelect(event: any): void {
        this.toolsService.pencilRadius = event.value;
    }

    onEraserSelect(event: any): void {
        this.toolsService.eraserRadius = event.value;
    }

    formatLabel(value: number): number {
        switch (value) {
            case 0:
                return 0;
            case 1:
                return 3;
            case 2:
                return 9;
            case 3:
                return 15;
            default:
                return 0;
        }
    }

    deleteImg(which: number): void {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-unused-expressions
        which === 0 ? (this.url0 = null) : (this.url1 = null);
    }

    switch(): void {
        const temp = this.url0;
        this.url0 = this.url1;
        this.url1 = temp;
    }

    async onSelectFile(e: Event, which: number): Promise<void> {
        const input = e.target as HTMLInputElement;
        if (input.files) {
            if (input.files[0].type !== 'image/bmp') {
                if (this.language === 'fr') {
                    this.customDialogService.openErrorDialog({
                        title: "Erreur de téléversement d'image",
                        message: 'Votre fichier doit être de type bmp. Veuillez réessayer.',
                    });
                } else {
                    this.customDialogService.openErrorDialog({
                        title: 'Image upload error',
                        message: 'Your file must be of type bmp. Please try again.',
                    });
                }
                return;
            } else if (input.files[0].size >= 640 * 481 * 3 || input.files[0].size <= 640 * 479 * 3) {
                if (this.language === 'fr') {
                    this.customDialogService.openErrorDialog({
                        title: "Erreur de téléversement d'image",
                        message: 'Votre fichier doit être de 24 bits et de dimensions 640x480. Veuillez réessayer.',
                    });
                } else {
                    this.customDialogService.openErrorDialog({
                        title: 'Image upload error',
                        message: 'Your file must be 24 bits and of dimensions 640x480. Please try again.',
                    });
                }
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(input.files[0]);
            reader.onload = () => {
                const image = new Image();
                this.processImage(image, which);
                image.src = reader.result as string;
            };
        }
    }

    processImage(image: HTMLImageElement, which: number): void {
        image.onload = () => {
            if (image.width !== CONSTS.DEFAULT_WIDTH && image.height !== CONSTS.DEFAULT_HEIGHT) {
                if (this.language === 'fr') {
                    this.customDialogService.openErrorDialog({
                        title: "Erreur de téléversement d'image",
                        message: 'Votre image doit être de dimensions 640x480. Veuillez réessayer.',
                    });
                } else {
                    this.customDialogService.openErrorDialog({
                        title: 'Image upload error',
                        message: 'Your image must be of dimensions 640x480. Please try again.',
                    });
                }
                return;
            } else {
                if (which === 0) this.url0 = image.src;
                else if (which === 1) this.url1 = image.src;
                else this.url0 = this.url1 = image.src;
            }
        };
    }
}
