import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportUserDialogComponent } from './report-user-dialog.component';

describe('ReportUserDialogComponent', () => {
  let component: ReportUserDialogComponent;
  let fixture: ComponentFixture<ReportUserDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReportUserDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
