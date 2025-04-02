import { PlayerIndex } from '@app/components/game-data';

export interface ReplayEvent {
    type: string;
    timestamp: number;
    player: PlayerIndex;
    data: any;
}
