import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageInterfaceComponent } from './message-interface.component';

describe('MessageInterfaceComponent', () => {
    let component: MessageInterfaceComponent;
    let fixture: ComponentFixture<MessageInterfaceComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [MessageInterfaceComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(MessageInterfaceComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
