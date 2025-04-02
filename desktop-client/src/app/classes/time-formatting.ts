export class TimeFormatting {
    format(time: number): string {
        const min = Math.floor(time / 60).toString();
        const sec = (time % 60).toString();
        return `${min.padStart(2, '0')}:${sec.padStart(2, '0')}`;
    }
}
