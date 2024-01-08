import { Component, Input } from '@angular/core';
import { GameData, PlayerIndex } from './../game-data';

@Component({
    selector: 'app-difference-count',
    templateUrl: './difference-count.component.html',
    styleUrls: ['./difference-count.component.scss'],
})
export class DifferenceCountComponent {
    @Input() hero: GameData;
    @Input() player: PlayerIndex;
    @Input() getPlayerName: (player: PlayerIndex) => string;

    roundNumber(num: number): number {
        return Math.ceil(num);
    }
}
