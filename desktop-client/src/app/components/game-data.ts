export interface GameData {
    id: string;
    matchId?: string;
    name: string;
    mode: string;
    difficulty: number;
    multiplayer: boolean;
    penalty: number;
    gain?: number;
    differenceCount: number;
    differencesFound1: number;
    differencesFound2: number;
    hintsUsed: number;
    startDate: number;
    playerName1: string;
    playerName2: string;
    isOver?: boolean;
    isHost?: boolean;
    initialTime?: number;
}

export enum PlayerIndex {
    None,
    Player1,
    Player2,
}
