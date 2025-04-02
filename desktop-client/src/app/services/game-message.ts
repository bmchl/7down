import { PlayerIndex } from '@app/components/game-data';

export interface GameMessage {
    time?: string;
    player: PlayerIndex;
    type: MessageType;
    value?: string;
}

export enum MessageType {
    Error,
    DifferenceFound,
    Abandonment,
    Chat,
    HintUsed,
    NewRecord,
}
