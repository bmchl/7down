import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalChatComponentComponent } from './global-chat-component.component';

describe('GlobalChatComponentComponent', () => {
  let component: GlobalChatComponentComponent;
  let fixture: ComponentFixture<GlobalChatComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GlobalChatComponentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalChatComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
