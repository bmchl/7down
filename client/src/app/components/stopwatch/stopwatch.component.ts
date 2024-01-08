/* eslint-disable @typescript-eslint/no-magic-numbers */
// stopwatch requires dividers for minutes, seconds and milliseconds
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TimeFormatting } from '@app/classes/time-formatting';
import { GameData } from './../game-data';

@Component({
    selector: 'app-stopwatch',
    templateUrl: './stopwatch.component.html',
    styleUrls: ['./stopwatch.component.scss'],
})
export class StopwatchComponent implements OnInit, OnDestroy {
    @Input() hero: GameData;
    @Input() timerEnd: () => void;
    stopwatchDisplay: string;
    time: TimeFormatting = new TimeFormatting();
    interval: number;

    ngOnInit(): void {
        if (this.hero.startDate === 0) this.hero.startDate = new Date().getTime();
        this.fetchTime();
        this.interval = window.setInterval(() => {
            if (!this.hero.isOver) {
                if (this.hero.mode === 'tl') this.decreaseTime();
                else this.fetchTime();
            }
        }, 10);
    }

    ngOnDestroy(): void {
        clearInterval(this.interval);
    }

    fetchTime(): void {
        const currentDate = new Date();
        const totalPenalty = this.hero.penalty * this.hero.hintsUsed;
        const time = Math.floor((currentDate.getTime() - this.hero.startDate) / 1000) + totalPenalty;
        this.stopwatchDisplay = this.time.format(time);
    }

    decreaseTime(): void {
        const totalPenalty = this.hero.penalty * this.hero.hintsUsed;
        const now = new Date().getTime();
        const elapsedTime = Math.floor((now - this.hero.startDate) / 1000) + totalPenalty;
        if ((this.hero.initialTime ? this.hero.initialTime : 0) - elapsedTime > 120) this.hero.initialTime = 120 + elapsedTime;
        const remainingTime = Math.min((this.hero.initialTime ? this.hero.initialTime : 0) - elapsedTime, 120);
        if (remainingTime <= 0) {
            clearInterval(this.interval);
            this.timerEnd();
        }
        this.stopwatchDisplay = this.time.format(remainingTime);
    }
}
