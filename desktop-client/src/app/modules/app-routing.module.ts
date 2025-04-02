import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CanDeactivateGuard } from '@app/components/CanDeactivateGuard';
import { AccountPageComponent } from '@app/pages/account-page/account-page.component';
import { AddFriendPageComponent } from '@app/pages/add-friend-page/add-friend-page.component';
import { ConfigPageComponent } from '@app/pages/config-page/config-page.component';
import { ConnexionPageComponent } from '@app/pages/connexion-page/connexion-page.component';
import { CreateAccountPageComponent } from '@app/pages/create-account-page/create-account-page.component';
import { CreationPageComponent } from '@app/pages/creation-page/creation-page.component';
import { CurrentMatchesPageComponent } from '@app/pages/current-matches-page/current-matches-page.component';
import { GameHistoryComponent } from '@app/pages/game-history/game-history.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { MapDetailPageComponent } from '@app/pages/map-detail-page/map-detail-page.component';
import { MessageInterfaceComponent } from '@app/pages/message-interface/message-interface.component';
import { PasswordResetPageComponent } from '@app/pages/password-reset-page/password-reset-page.component';
import { SelectionPageComponent } from '@app/pages/selection-page/selection-page.component';
import { TimeLimitLobbyComponent } from '@app/pages/time-limit-lobby/time-limit-lobby.component';
import { TimeLimitPageComponent } from '@app/pages/time-limit-page/time-limit-page.component';
//import { SelectionPageComponent } from '@app/pages/selection-page/selection-page.component';
//import { TimeLimitPageComponent } from '@app/pages/time-limit-page/time-limit-page.component';
//import { UserPageComponent } from '@app/pages/user-page/user-page.component';

const routes: Routes = [
    { path: '', redirectTo: '/connexion', pathMatch: 'full' },
    { path: 'connexion', component: ConnexionPageComponent },
    { path: 'account', component: AccountPageComponent },
    { path: 'create-account', component: CreateAccountPageComponent },
    { path: 'add-friend', component: AddFriendPageComponent },
    { path: 'password-reset', component: PasswordResetPageComponent },
    { path: 'main', component: MainPageComponent },
    { path: 'game', component: GamePageComponent, canDeactivate: [CanDeactivateGuard] },
    { path: 'time-limit-lobby', component: TimeLimitLobbyComponent, canDeactivate: [CanDeactivateGuard] },
    { path: 'classic/:id', component: MapDetailPageComponent, canDeactivate: [CanDeactivateGuard] },
    { path: 'matches', component: CurrentMatchesPageComponent },
    { path: 'classic', component: SelectionPageComponent },
    { path: 'config', component: ConfigPageComponent },
    { path: 'create', component: CreationPageComponent },
    { path: 'time-limit', component: TimeLimitPageComponent, canDeactivate: [CanDeactivateGuard] },
    { path: 'history', component: GameHistoryComponent },
    { path: 'home', component: MessageInterfaceComponent },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
