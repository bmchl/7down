import { Component, Input } from '@angular/core';
import { TimeFormatting } from '@app/classes/time-formatting';

@Component({
    selector: 'app-leaderboards',
    templateUrl: './leaderboards.component.html',
    styleUrls: ['./leaderboards.component.scss'],
})
export class LeaderboardsComponent {
    @Input() solo: object[];
    @Input() multi: object[];
    displayedColumns: string[] = ['position', 'player-name', 'record-time'];
    time: TimeFormatting = new TimeFormatting();
}
