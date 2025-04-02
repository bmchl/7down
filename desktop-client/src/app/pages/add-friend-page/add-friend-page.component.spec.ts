import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddFriendPageComponent } from './add-friend-page.component';

describe('AddFriendPageComponent', () => {
  let component: AddFriendPageComponent;
  let fixture: ComponentFixture<AddFriendPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddFriendPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddFriendPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
