import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapDetailPageComponent } from './map-detail-page.component';

describe('MapDetailPageComponent', () => {
  let component: MapDetailPageComponent;
  let fixture: ComponentFixture<MapDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MapDetailPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
