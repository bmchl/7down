import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { GameData } from '@app/components/game-data';

@Injectable({
    providedIn: 'root',
})
export class ClassicGameLogicService {
    hero: GameData | undefined;
    gameService: { id: string; differencesFound: number; differenceCount: number; penalty: number; isOver: false };
    constructor(private zone: NgZone, public router: Router) {}

    onUndefinedHero() {
        this.zone.run(() => {
            this.router.navigate(['/']);
        });
    }
}
