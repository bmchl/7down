import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { AppRoutingModule } from '@app/modules/app-routing.module';
import { AppMaterialModule } from '@app/modules/material.module';
import { AppComponent } from '@app/pages/app/app.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { MaterialPageComponent } from '@app/pages/material-page/material-page.component';
import { ColorPickerModule } from 'ngx-color-picker';
import { ConfigSelectContentComponent } from './components/config-select-content/config-select-content.component';
import { DifferenceCountComponent } from './components/difference-count/difference-count.component';
import { EditAreaComponent } from './components/edit-area/edit-area.component';
import { GameInfoComponent } from './components/game-info/game-info.component';
import { GameItemComponent } from './components/game-item/game-item.component';
import { GamesDisplayComponent } from './components/games-display/games-display.component';
import { HeaderComponent } from './components/header/header.component';
import { HintsComponent } from './components/hints/hints.component';
import { LeaderboardsComponent } from './components/leaderboards/leaderboards.component';
import { MessagesComponent } from './components/messages/messages.component';
import { StopwatchComponent } from './components/stopwatch/stopwatch.component';
import { BasicDialogComponent } from './dialogs/basic-dialog/basic-dialog.component';
import { DiffDialogComponent } from './dialogs/diff-dialog/diff-dialog.component';
import { ErrorDialogComponent } from './dialogs/error-dialog/error-dialog.component';
import { GameConstantsDialogComponent } from './dialogs/game-constants-dialog/game-constants-dialog.component';
import { InputDialogComponent } from './dialogs/input-dialog/input-dialog.component';
import { WaitlistDialogComponent } from './dialogs/waitlist-dialog/waitlist-dialog.component';
import { LoadingDialogComponent } from './dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from './dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { TimeLimitedDialogComponent } from './dialogs/time-limited-dialog/time-limited-dialog.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { CreationPageComponent } from './pages/creation-page/creation-page.component';
import { GameHistoryComponent } from './pages/game-history/game-history.component';
import { SelectionPageComponent } from './pages/selection-page/selection-page.component';
import { TimeLimitPageComponent } from './pages/time-limit-page/time-limit-page.component';
/*
 * Main module that is used in main.ts.
 * All automatically generated components will appear in this module.
 * Please do not move this module in the module folder.
 * Otherwise Angular Cli will not know in which module to put new component
 */
@NgModule({
    declarations: [
        AppComponent,
        GamePageComponent,
        MainPageComponent,
        MaterialPageComponent,
        PlayAreaComponent,
        MessagesComponent,
        SelectionPageComponent,
        ConfigPageComponent,
        CreationPageComponent,
        TimeLimitPageComponent,
        GameItemComponent,
        GamesDisplayComponent,
        ErrorDialogComponent,
        DiffDialogComponent,
        GameInfoComponent,
        StopwatchComponent,
        HintsComponent,
        BasicDialogComponent,
        WaitlistDialogComponent,
        DifferenceCountComponent,
        HeaderComponent,
        InputDialogComponent,
        ConfigSelectContentComponent,
        LeaderboardsComponent,
        LoadingDialogComponent,
        EditAreaComponent,
        GameConstantsDialogComponent,
        LoadingWithButtonDialogComponent,
        TimeLimitedDialogComponent,
        GameHistoryComponent,
    ],
    imports: [
        ColorPickerModule,
        AppMaterialModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        CommonModule,
    ],
    providers: [{ provide: MatDialogRef, useValue: {} }],
    bootstrap: [AppComponent],
})
export class AppModule {}
