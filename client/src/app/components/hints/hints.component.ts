import { Component, Input } from '@angular/core';
import { GameData } from '@app/components/game-data';

@Component({
    selector: 'app-hints',
    templateUrl: './hints.component.html',
    styleUrls: ['./hints.component.scss'],
})
export class HintsComponent {
    @Input() hero: GameData;
}
