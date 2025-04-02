import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurrentMatchesPageComponent } from './current-matches-page.component';

describe('CurrentMatchesPageComponent', () => {
  let component: CurrentMatchesPageComponent;
  let fixture: ComponentFixture<CurrentMatchesPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurrentMatchesPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CurrentMatchesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
