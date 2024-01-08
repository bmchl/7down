import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfigPageComponent } from '@app/pages/config-page/config-page.component';
import { CreationPageComponent } from '@app/pages/creation-page/creation-page.component';
import { GameHistoryComponent } from '@app/pages/game-history/game-history.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { MaterialPageComponent } from '@app/pages/material-page/material-page.component';
import { SelectionPageComponent } from '@app/pages/selection-page/selection-page.component';
import { TimeLimitPageComponent } from '@app/pages/time-limit-page/time-limit-page.component';

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
    { path: 'game', component: GamePageComponent },
    { path: 'material', component: MaterialPageComponent },
    { path: 'select', component: SelectionPageComponent },
    { path: 'config', component: ConfigPageComponent },
    { path: 'create', component: CreationPageComponent },
    { path: 'time-limit', component: TimeLimitPageComponent },
    { path: 'history', component: GameHistoryComponent },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
