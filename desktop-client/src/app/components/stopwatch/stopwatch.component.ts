/* eslint-disable @typescript-eslint/no-magic-numbers */
// stopwatch requires dividers for minutes, seconds and milliseconds
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TimeFormatting } from '@app/classes/time-formatting';
import { AuthService } from '@app/services/auth-service';
import { ClassicGameLogicService } from '@app/services/classic-game-logic.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'app-stopwatch',
    templateUrl: './stopwatch.component.html',
    styleUrls: ['./stopwatch.component.scss'],
})
export class StopwatchComponent implements OnInit, OnDestroy {
    @Input() timerEnd: () => void;
    stopwatchDisplay: string;
    time: TimeFormatting = new TimeFormatting();
    interval: number;
    uid: string | null;

    constructor(public gameService: ClassicGameLogicService, public authService: AuthService, public translateService: TranslateService) {}

    ngOnInit(): void {
        (async () => {
            if (sessionStorage.getItem('user_uid') === null) {
                this.uid = this.authService.getUID();
                sessionStorage.setItem('user_uid', this.uid);
            } else {
                this.uid = sessionStorage.getItem('user_uid');
            }
            const language = await this.authService.getLanguage(this.uid);
            this.translateService.use(language);
        })();
        // if (this.gameService.match?.startDate === 0) this.hero.startDate = new Date().getTime();
        this.fetchTime();
        this.interval = window.setInterval(() => {
            if (this.gameService.match?.winnerSocketId === undefined) {
                this.decreaseTime();
            }
        }, 10);
    }

    ngOnDestroy(): void {
        clearInterval(this.interval);
    }

    fetchTime(): void {
        const currentDate = new Date();
        // const totalPenalty = this.hero.penalty * this.hero.hintsUsed;
        // const time = Math.floor((currentDate.getTime() - (this.gameService.match?.startTime ?? 0)) / 1000) + totalPenalty;
        const time = Math.floor((currentDate.getTime() - (this.gameService.match?.startTime ?? 0)) / 1000);
        this.stopwatchDisplay = this.time.format(time);
    }

    decreaseTime(): void {
        const now = new Date().getTime();
        const elapsedTime = Math.floor((now - (this.gameService.match?.startTime ?? 0)) / 1000);
        const gameDuration = this.gameService.match?.gameDuration ?? 0;
        const bonusTimeOnHit = this.gameService.match?.bonusTimeOnHit ?? 0;
        const foundDifferences = this.gameService.match?.players?.reduce((total, player) => total + player.found, 0) ?? 0;

        let remainingTime = Math.min(gameDuration - elapsedTime + foundDifferences * bonusTimeOnHit, gameDuration);
        remainingTime = Math.max(remainingTime, 0);

        if (remainingTime <= 0) {
            clearInterval(this.interval);
            this.timerEnd();
        }

        this.stopwatchDisplay = this.time.format(remainingTime);
    }
}
