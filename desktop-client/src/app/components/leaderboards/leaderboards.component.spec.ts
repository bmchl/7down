import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { BasicDialogComponent } from '@app/dialogs/basic-dialog/basic-dialog.component';
import { AppMaterialModule } from '@app/modules/material.module';
import { LeaderboardsComponent } from './leaderboards.component';

describe('LeaderboardsComponent', () => {
    let component: LeaderboardsComponent;
    let fixture: ComponentFixture<LeaderboardsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [LeaderboardsComponent, BasicDialogComponent],
            imports: [AppMaterialModule, BrowserAnimationsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(LeaderboardsComponent);
        component = fixture.componentInstance;
        component.multi = [];
        component.solo = [];
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
