export interface Game {
    id: string;
    gameName: string;
    image: string;
    image1: string;
    imageDifference: number[][][];
    difficulty: number;
    differenceCount: number;
    penalty: number;
    gain?: number;
    mode?: string;
    soloLeaderboard: Object[];
    multiLeaderboard: Object[];
    isGameOn?: boolean;
}

export interface Match {
    id: string;
    gameId?: string;
    player0?: string;
    player1: string;
    startDate: number;
    multiplayer: boolean;
    timeLimit: boolean;
    forfeiter?: boolean;
    winner: string;
    endTime?: number;
    totalTime?: number;
    completionTime: number;
    playerAbandoned?: string;
}

export interface CreateGame {
    gameName: string;
    image: string;
    image1: string;
    radius: number;
}

export interface TopPlayer {
    playerName: string;
    recordTime: number;
}

export interface Constants {
    initialTime: number;
    penalty: number;
    timeGainPerDiff: string;
}