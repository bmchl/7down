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
    likes?: number;
    plays?: number;
    creator?: string;
    creationDate?: string;
    deleted?: boolean;
}

export interface NewMatch {
    matchId: string;
    mapId?: string;
    gamemode: 'classic' | 'time-limit';
    games?: Game[];
    gamesIndex?: number;
    differenceIndex?: number[];
    startTime: number;
    endTime?: number;
    initialTime?: number;
    winnerSocketId?: string;
    visibility?: string;
    pendingDeletion?: boolean;
    selected?: boolean;
    players: {
        id: string;
        uid: string;
        name: string;
        profilePic?: string;
        found: number;
        creator?: boolean;
        forfeitter?: boolean;
        requestedDeletion?: boolean;
    }[];
    foundDifferencesIndex?: number[];
    spectators: {
        id: string;
        name: string;
    }[];
    gameDuration: number;
    bonusTimeOnHit?: number;
    cheatAllowed?: boolean;
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


