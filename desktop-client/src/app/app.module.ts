import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterModule, Routes } from '@angular/router';
import { PlayAreaComponent } from '@app/components/play-area/play-area.component';
import { AppRoutingModule } from '@app/modules/app-routing.module';
import { AppMaterialModule } from '@app/modules/material.module';
import { AppComponent } from '@app/pages/app/app.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { MaterialPageComponent } from '@app/pages/material-page/material-page.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firebaseConfig } from 'firebase/firebaseConfig';
import { ColorPickerModule } from 'ngx-color-picker';
import { ConfigSelectContentComponent } from './components/config-select-content/config-select-content.component';
import { DifferenceCountComponent } from './components/difference-count/difference-count.component';
import { EditAreaComponent } from './components/edit-area/edit-area.component';
import { GameChatComponent } from './components/game-chat/game-chat.component';
import { GameInfoComponent } from './components/game-info/game-info.component';
import { GameItemComponent } from './components/game-item/game-item.component';
import { GamesDisplayComponent } from './components/games-display/games-display.component';
import { GlobalChatComponent } from './components/global-chat-component/global-chat-component.component';
import { HeaderComponent } from './components/header/header.component';
import { HintsComponent } from './components/hints/hints.component';
import { LeaderboardsComponent } from './components/leaderboards/leaderboards.component';
import { MessagesComponent } from './components/messages/messages.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { StopwatchComponent } from './components/stopwatch/stopwatch.component';
import { BasicDialogComponent } from './dialogs/basic-dialog/basic-dialog.component';
import { ConfirmationDialogComponent } from './dialogs/confirmation-dialog/confirmation-dialog.component';
import { CreateMatchDialogComponent } from './dialogs/create-match-dialog/create-match-dialog.component';
import { DiffDialogComponent } from './dialogs/diff-dialog/diff-dialog.component';
import { ErrorDialogComponent } from './dialogs/error-dialog/error-dialog.component';
import { GameConstantsDialogComponent } from './dialogs/game-constants-dialog/game-constants-dialog.component';
import { InputDialogComponent } from './dialogs/input-dialog/input-dialog.component';
import { LoadingDialogComponent } from './dialogs/loading-dialog/loading-dialog.component';
import { LoadingWithButtonDialogComponent } from './dialogs/loading-with-button-dialog/loading-with-button-dialog.component';
import { ReportUserDialogComponent } from './dialogs/report-user-dialog/report-user-dialog.component';
import { TimeLimitedDialogComponent } from './dialogs/time-limited-dialog/time-limited-dialog.component';
import { WaitlistDialogComponent } from './dialogs/waitlist-dialog/waitlist-dialog.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { AddFriendPageComponent } from './pages/add-friend-page/add-friend-page.component';
import { ConfigPageComponent } from './pages/config-page/config-page.component';
import { ConnexionPageComponent } from './pages/connexion-page/connexion-page.component';
import { CreateAccountPageComponent } from './pages/create-account-page/create-account-page.component';
import { CreationPageComponent } from './pages/creation-page/creation-page.component';
import { CurrentMatchesPageComponent } from './pages/current-matches-page/current-matches-page.component';
import { GameHistoryComponent } from './pages/game-history/game-history.component';
import { MapDetailPageComponent } from './pages/map-detail-page/map-detail-page.component';
import { MessageInterfaceComponent } from './pages/message-interface/message-interface.component';
import { PasswordResetPageComponent } from './pages/password-reset-page/password-reset-page.component';
import { SelectionPageComponent } from './pages/selection-page/selection-page.component';
import { TimeLimitLobbyComponent } from './pages/time-limit-lobby/time-limit-lobby.component';
import { TimeLimitPageComponent } from './pages/time-limit-page/time-limit-page.component';
import { DraggableDirective } from './services/draggable.directive';
import { ParticipantDialogComponent } from './dialogs/participant-dialog/participant-dialog.component';

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

const routes: Routes = [{ path: 'standalone-chat', component: GlobalChatComponent }];

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
        ConnexionPageComponent,
        CreateAccountPageComponent,
        AccountPageComponent,
        MessageInterfaceComponent,
        AddFriendPageComponent,
        PasswordResetPageComponent,
        ConfirmationDialogComponent,
        MapDetailPageComponent,
        SidebarComponent,
        TimeLimitLobbyComponent,
        GlobalChatComponent,
        ReportUserDialogComponent,
        DraggableDirective,
        CurrentMatchesPageComponent,
        ReportUserDialogComponent,
        DraggableDirective,
        CreateMatchDialogComponent,
        GameChatComponent,
        ParticipantDialogComponent,
        
    ],
    imports: [
        AngularFireModule.initializeApp(firebaseConfig),
        AngularFireStorageModule,
        AngularFireAuthModule,
        MatSnackBarModule,
        MatSnackBarModule,
        MatAutocompleteModule,
        ColorPickerModule,
        AppMaterialModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        ReactiveFormsModule,
        AngularFireStorageModule,
        HttpClientModule,
        CommonModule,
        MatSelectModule,
        AppRoutingModule,
        RouterModule.forRoot(routes),
        AppRoutingModule,
        RouterModule.forRoot(routes),
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: createTranslateLoader,
                deps: [HttpClient],
            },
        }),
    ],

    providers: [{ provide: MatDialogRef, useValue: {} }, MatSnackBar],
    bootstrap: [AppComponent],
    exports: [RouterModule],
})
export class AppModule {}
