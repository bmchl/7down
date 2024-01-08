import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RouterTestingModule } from '@angular/router/testing';
import { AppMaterialModule } from '@app/modules/material.module';
import { SocketClientService } from '@app/services/socket-client.service';
import { WaitlistDialogComponent } from './waitlist-dialog.component';

describe('WaitlistDialogComponent', () => {
    let component: WaitlistDialogComponent;
    let fixture: ComponentFixture<WaitlistDialogComponent>;
    let socketClientService: jasmine.SpyObj<SocketClientService>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<WaitlistDialogComponent>>;

    beforeEach(async () => {
        socketClientService = jasmine.createSpyObj('SocketClientService', ['send']);
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [AppMaterialModule, RouterTestingModule],
            providers: [
                { provide: MAT_DIALOG_DATA, useValue: { title: '', routerLink: '', cancel: '', confirmQuit: '' } },
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: SocketClientService, useValue: socketClientService },
            ],
            declarations: [WaitlistDialogComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitlistDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('accept should set accepted to true and close the dialog', () => {
        const joiner = { id: '1', accepted: false, denied: false, gameId: '1', name: '' };
        component.data.joiners = [joiner];
        component.accept(joiner);
        expect(joiner.accepted).toBeTrue();
        expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    it('deny should set denied to true', () => {
        const joiner = { id: '1', accepted: false, denied: false, gameId: '1', name: '' };
        component.deny(joiner);
        expect(joiner.denied).toBeTrue();
        expect(joiner.accepted).toBeFalse();
    });

    it('filteredJoiners should return joiners with denied false', () => {
        component.data.joiners = [{ id: '1', accepted: false, denied: false, gameId: '1', name: '' }];
        expect(component.filteredJoiners).toEqual([{ id: '1', accepted: false, denied: false, gameId: '1', name: '' }]);
    });
});
