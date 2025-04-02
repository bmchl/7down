import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Game, NewMatch } from '@common/game';

@Injectable({
    providedIn: 'root',
})
export class ClassicGameLogicService {
    match: NewMatch;
    map: Game | undefined;
    spectator: boolean = false;
    constructor(private zone: NgZone, public router: Router) {}

    onUndefinedMatch() {
        this.zone.run(() => {
            this.router.navigate(['/classic']);
        });
    }
}
