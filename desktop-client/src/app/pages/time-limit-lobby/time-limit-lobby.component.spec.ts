import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeLimitLobbyComponent } from './time-limit-lobby.component';

describe('TimeLimitLobbyComponent', () => {
  let component: TimeLimitLobbyComponent;
  let fixture: ComponentFixture<TimeLimitLobbyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimeLimitLobbyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeLimitLobbyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
