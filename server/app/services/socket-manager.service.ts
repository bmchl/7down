/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
/* eslint-disable max-lines */
import { DB_CONSTS } from '@app/utils/env';
import { Game, NewMatch } from '@common/game';
import { randomUUID } from 'crypto';
import * as http from 'http';
import * as io from 'socket.io';
import { Service } from 'typedi';
import { DatabaseService } from './database.service';
import { GamesService } from './games.service';

interface CreatorNameMap {
    [gameId: string]: string;
}

interface Joiner {
    name: string;
    id: string;
    gameId: string;
    accepted?: boolean;
}

interface JoinersMap {
    [gameId: string]: Joiner[];
}

interface SocketIdToUsername {
    [socketId: string]: string;
}

interface ClassicMatch {
    [matchId: string]: {
        gamemode: 'classic';
        matchId: string;
        mapId: string;
        visibility?: string;
        startTime: number;
        winnerSocketId?: string;
        players: {
            id: string;
            uid: string;
            name: string;
            profilePic?: string;
            found: number;
            creator?: boolean;
            forfeitter?: boolean;
        }[];
        foundDifferencesIndex: number[];
        spectators: {
            id: string;
            name: string;
        }[];
        gameDuration: number;
        cheatAllowed: boolean;
    };
}

interface TimeLimitMatch {
    [matchId: string]: {
        gamemode: 'time-limit';
        matchId: string;
        games?: Game[];
        gamesIndex?: number;
        differenceIndex?: number[];
        startTime: number;
        visibility?: string;
        winnerSocketId?: string;
        players: {
            id: string;
            uid: string;
            name: string;
            profilePic?: string;
            found: number;
            creator?: boolean;
            forfeitter?: boolean;
        }[];
        spectators: {
            id: string;
            name: string;
        }[];
        gameDuration: number;
        bonusTimeOnHit: number;
        cheatAllowed: boolean;
    };
}

interface MapIdToMatchIds {
    [mapId: string]: string[];
}

@Service()
export class SocketManager {
    socketIdToUsername: SocketIdToUsername = {};
    creatorNames: CreatorNameMap = {};
    joinersMap: JoinersMap = {};
    private diffByMatch: {
        [matchId: string]: { diff: number[][][]; startTime: number };
    } = {};
    private sio: io.Server;
    private mapIdToMatchIds: MapIdToMatchIds = {};
    private timeLimitMatches: TimeLimitMatch = {};
    private classicMatches: ClassicMatch = {};
    private timers: { [matchId: string]: NodeJS.Timeout } = {};

    constructor(server: http.Server, public dbService: DatabaseService, public gameService: GamesService) {
        this.sio = new io.Server(server, {
            cors: { origin: '*', methods: ['GET', 'POST'] },
        });
        this.creatorNames = {};
    }

    mapIdToMatches = (mapId: string) => {
        if (!this.mapIdToMatchIds[mapId]) return [];
        return this.mapIdToMatchIds[mapId].map((matchId) => this.classicMatches[matchId]);
    };

    handleIter(room: string, cb: (sock: any) => void) {
        const rooms = this.sio.sockets.adapter.rooms.get(room);
        let sockets: any[] = [];
        if (rooms) {
            sockets = [...rooms.values()];
        }
        sockets.forEach(cb);
    }

    cancelFromClient = async (data: any) => {
        this.handleIter(data.gameId, (sock: any) => {
            (this.sio.sockets.sockets.get(sock) as any).emit('player-refuse');
            (this.sio.sockets.sockets.get(sock) as any).leave(data.gameId);
        });

        this.sio.emit('update-game-button', {
            gameId: data.gameId,
            gameOn: false,
        });

        await this.gameService.dbService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES).updateOne({ id: data.gameId }, { $set: { isGameOn: false } });
    };

    triggerGameEndClassic = async (matchId: string, playerIndex: number) => {
        try {
            clearTimeout(this.timers[matchId]);
            await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).updateOne(
                { matchId },
                {
                    $set: {
                        players: this.classicMatches[matchId].players,
                        winnerSocketId: this.classicMatches[matchId].players[playerIndex].id,
                        endTime: Date.now(),
                    },
                },
            );

            delete this.diffByMatch[matchId];
            const match: NewMatch = {
                ...this.classicMatches[matchId],
                winnerSocketId: this.classicMatches[matchId].players[playerIndex].id,
                gamemode: 'classic',
                endTime: Date.now(),
            };
            this.sio.to(matchId).emit('game-ended', { match });
            this.handleIter(matchId, (sock: any) => {
                (this.sio.sockets.sockets.get(sock) as any).leave(matchId as string);
            });
            // const mapId = this.classicMatches[matchId].mapId;
            delete this.classicMatches[matchId];
            // this.mapIdToMatches[mapId] = this.mapIdToMatchIds[mapId].filter(
            //     (matchId_) => matchId_ !== matchId
            // );
            this.sio.emit('s/update-awaiting-matches', {
                matches: [...Object.values(this.classicMatches), ...Object.values(this.timeLimitMatches)],
            });
        } catch (e) {
            console.error(e);
        }
    };

    triggerGameEndTimeLimit = async (matchId: string, playerIndex?: number) => {
        try {
            clearTimeout(this.timers[matchId]);
            if (playerIndex === undefined) {
                playerIndex = this.timeLimitMatches[matchId]?.players.reduce((acc, cur, index) => {
                    if (cur.found > this.timeLimitMatches[matchId].players[acc].found) {
                        return index;
                    } else {
                        return acc;
                    }
                }, 0);
            }

            await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).updateOne(
                { matchId },
                {
                    $set: {
                        players: this.timeLimitMatches[matchId].players,
                        winnerSocketId: this.timeLimitMatches[matchId].players[playerIndex].id,
                        endTime: Date.now(),
                    },
                },
            );

            console.log('triggerGameEndTimeLimit', this.timeLimitMatches[matchId].players);

            const match: NewMatch = {
                ...this.timeLimitMatches[matchId],
                winnerSocketId: this.timeLimitMatches[matchId].players[playerIndex].id,
                gamemode: 'time-limit',
                endTime: Date.now(),
            };
            this.sio.to(matchId).emit('game-ended', { match });
            this.handleIter(matchId, (sock: any) => {
                (this.sio.sockets.sockets.get(sock) as any).leave(matchId as string);
            });
            delete this.timeLimitMatches[matchId];
            this.sio.emit('s/update-awaiting-matches', {
                matches: [...Object.values(this.classicMatches), ...Object.values(this.timeLimitMatches)],
            });
        } catch (e) {
            console.error(e);
        }
    };

    handleSockets(): void {
        this.sio.on('connection', (socket) => {
            // START OF SOCKET FUNCTIONS FOR CHAT APP
            socket.on('register', (data: any) => {
                if (Object.values(this.socketIdToUsername).includes(data)) {
                    socket.emit('register-error', 'Username already taken');
                    return;
                }
                this.socketIdToUsername[socket.id] = data;
            });

            socket.on('global-message', (data: any) => {
                this.sio.sockets.emit('global-message', {
                    sender: socket.id,
                    username: this.socketIdToUsername[socket.id],
                    message: data,
                });
            });

            socket.on('disconnecting', () => {
                delete this.socketIdToUsername[socket.id];

                Object.keys(this.classicMatches).forEach((matchId) => {
                    this.classicMatches[matchId].players.findIndex((p) => p.id === socket.id);
                    if (this.classicMatches[matchId].players.length === 0) {
                        const mapId = this.classicMatches[matchId].mapId;
                        this.mapIdToMatchIds[mapId] = this.mapIdToMatchIds[mapId].filter((matchId_) => matchId_ !== matchId);
                        delete this.classicMatches[matchId];
                        this.sio.emit('update-awaiting-matches', {
                            map: mapId,
                            matches: this.mapIdToMatches(mapId),
                        });
                    } else this.classicMatches[matchId].players[0].creator = true;
                    this.sio.to(matchId).emit('update-match-info', {
                        match: this.classicMatches[matchId],
                    });
                });
            });
            // END OF SOCKET FUNCTIONS FOR CHAT APP

            // START OF SOCKET FUNCTIONS FOR LIKE COUNTS
            socket.on('like-game', async (data: any) => {
                await this.gameService.dbService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES).updateOne({ id: data.gameId }, { $inc: { likes: 1 } });
                this.sio.emit('refresh-games');
            });

            socket.on('dislike-game', async (data: any) => {
                await this.gameService.dbService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES).updateOne({ id: data.gameId }, { $inc: { likes: -1 } });
                this.sio.emit('refresh-games');
            });

            socket.on('s/get-lobbies', async () => {
                this.sio.emit('s/update-awaiting-matches', {
                    matches: [...Object.values(this.classicMatches), ...Object.values(this.timeLimitMatches)],
                });
            });

            socket.on('s/spectate-match', async (data: { matchId: string }) => {
                const match = this.classicMatches[data.matchId] ?? this.timeLimitMatches[data.matchId];
                if (match) {
                    socket.join(data.matchId);
                    match.spectators.push({
                        id: socket.id,
                        name: this.socketIdToUsername[socket.id],
                    });
                    this.sio.to(data.matchId).emit('update-match', { match });

                    this.sio.emit('s/update-awaiting-matches', {
                        matches: [...Object.values(this.classicMatches), ...Object.values(this.timeLimitMatches)],
                    });
                }
            });

            socket.on('s/stop-spectating', async () => {
                const matchId = Array.from(socket.rooms)[1];
                socket.leave(matchId);

                const match = this.classicMatches[matchId] ?? this.timeLimitMatches[matchId];
                if (match) {
                    match.spectators = match.spectators.filter((s) => s.id !== socket.id);
                    this.sio.to(matchId).emit('update-match', { match });

                    this.sio.emit('s/update-awaiting-matches', {
                        matches: [...Object.values(this.classicMatches), ...Object.values(this.timeLimitMatches)],
                    });
                }
            });

            socket.on('s/draw-hint', async (data: { x: number; y: number; width: number; height: number; toIndex: number }) => {
                const matchId = Array.from(socket.rooms)[1];

                const match = this.classicMatches[matchId] ?? this.timeLimitMatches[matchId];
                if (match) {
                    const spectatorIndex = match.spectators.findIndex((s) => s.id === socket.id);
                    if (spectatorIndex === -1) return;

                    const dataWithColor = {
                        ...data,
                        color: ['red', 'blue', 'green', 'yellow'][spectatorIndex % 4],
                    };

                    this.sio.to(matchId).emit('s/draw-hint', dataWithColor);
                }
            });

            socket.on('all/update-match', async () => {
                const matchId = Array.from(socket.rooms)[1];
                this.sio.to(matchId).emit('update-match', {
                    match: this.classicMatches[matchId] ?? this.timeLimitMatches[matchId],
                });
            });

            // START OF SOCKET FUNCTIONS FOR CLASSIC GAME MODE
            socket.on('c/get-lobbies', async (data: { mapId: string }) => {
                socket.emit('update-awaiting-matches', {
                    map: data.mapId,
                    matches: this.mapIdToMatches(data.mapId),
                });
            });

            socket.on('c/create-lobby', async (data) => {
                const matchId = randomUUID();

                // Update the in-memory structure for the match
                this.classicMatches[matchId] = {
                    gamemode: 'classic',
                    matchId,
                    mapId: data.mapId,
                    startTime: 0,
                    visibility: data.visibility,
                    players: [
                        {
                            id: socket.id,
                            uid: (socket.handshake.query.uid as string) ?? data.creatorUid,
                            name: (socket.handshake.query.username as string) ?? socket.id,
                            profilePic: (socket.handshake.query.profilePic as string) ?? '',
                            found: 0,
                            creator: true,
                        },
                    ],
                    foundDifferencesIndex: [],
                    spectators: [],
                    gameDuration: data.gameDuration,
                    cheatAllowed: data.cheatAllowed,
                };

                this.mapIdToMatchIds[data.mapId] = [...(this.mapIdToMatchIds[data.mapId] ?? []), matchId];
                socket.join(matchId);

                // Notify all clients about the update in awaiting matches
                this.sio.emit('update-awaiting-matches', {
                    map: data.mapId,
                    matches: this.mapIdToMatches(data.mapId),
                });
            });

            // socket.on('c/join-lobby', async (data: { matchId: string }) => {
            //     if (this.classicMatches[data.matchId].players.length >= 4) {
            //         socket.emit('error', { message: 'The lobby is full.' });
            //         return;
            //     }
            //     this.classicMatches[data.matchId].players.push({ id: socket.id, name: this.socketIdToUsername[socket.id], found: 0 });
            //     socket.join(data.matchId);
            //     this.sio.to(data.matchId).emit('update-match-info', { match: this.classicMatches[data.matchId] });
            // });

            socket.on('c/join-lobby', async (data: { matchId: string; creatorUid?: string }) => {
                if (!this.classicMatches[data.matchId]) {
                    socket.emit('error', { message: 'Lobby does not exist.' });
                    return;
                }

                if (this.classicMatches[data.matchId].players.length >= 4) {
                    socket.emit('error', { message: 'The lobby is full.' });
                    return;
                }

                this.classicMatches[data.matchId].players.push({
                    id: socket.id,
                    uid: (socket.handshake.query.uid as string) ?? data.creatorUid,
                    name: (socket.handshake.query.username as string) ?? socket.id,
                    profilePic: (socket.handshake.query.profilePic as string) ?? '',
                    found: 0,
                    creator: false, // Assuming only the first player is the creator
                });

                socket.join(data.matchId);

                this.sio.to(data.matchId).emit('update-match-info', {
                    match: this.classicMatches[data.matchId],
                });

                this.sio.emit('update-awaiting-matches', {
                    map: this.classicMatches[data.matchId].mapId,
                    matches: this.mapIdToMatches(this.classicMatches[data.matchId].mapId),
                });
            });

            socket.on('c/leave-lobby', async (data: { matchId: string }) => {
                try {
                    this.classicMatches[data.matchId].players = this.classicMatches[data.matchId].players.filter((player) => player.id !== socket.id);

                    if (this.classicMatches[data.matchId].players.length === 0) {
                        const mapId = this.classicMatches[data.matchId].mapId;
                        this.mapIdToMatchIds[mapId] = this.mapIdToMatchIds[mapId].filter((matchId) => matchId !== data.matchId);
                        delete this.classicMatches[data.matchId];
                        this.sio.emit('update-awaiting-matches', { map: mapId, matches: this.mapIdToMatches(mapId) });

                        // Consider adding Firebase cleanup here if needed
                    } else {
                        this.classicMatches[data.matchId].players[0].creator = true;
                        this.sio.to(data.matchId).emit('update-match-info', { match: this.classicMatches[data.matchId] });
                        this.sio.emit('update-awaiting-matches', {
                            map: this.classicMatches[data.matchId].mapId,
                            matches: this.mapIdToMatches(this.classicMatches[data.matchId].mapId),
                        });
                    }
                    socket.leave(data.matchId);
                    socket.emit('leave-lobby-ack', { success: true, message: 'Successfully left the lobby.' });
                } catch (e) {
                    console.error(e);
                    socket.emit('leave-lobby-ack', { success: false, message: 'Failed to leave the lobby.' });
                }
            });

            socket.on('c/start-game', async (data: { matchId: string }) => {
                try {
                    if (this.classicMatches[data.matchId].players.length < 2) {
                        socket.emit('error', { message: 'Not enought players.' });
                        return;
                    }
                    this.classicMatches[data.matchId].startTime = Date.now();
                    const match: NewMatch = {
                        ...this.classicMatches[data.matchId],
                        gamemode: 'classic',
                    };

                    await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).insertOne(match);

                    this.sio.emit('update-awaiting-matches', {
                        map: data.matchId,
                        matches: this.mapIdToMatches(data.matchId),
                    });

                    this.sio.emit('s/update-awaiting-matches', {
                        matches: [...Object.values(this.classicMatches), ...Object.values(this.timeLimitMatches)],
                    });

                    this.diffByMatch[data.matchId] = {
                        diff: (
                            await this.gameService.dbService.db
                                .collection(DB_CONSTS.DB_COLLECTION_GAMES)
                                .findOne({ id: match.mapId }, { projection: { imageDifference: 1 } })
                        ).imageDifference,
                        startTime: Date.now(),
                    };

                    // increment play count
                    await this.gameService.dbService.db
                        .collection(DB_CONSTS.DB_COLLECTION_GAMES)
                        .updateOne({ id: match.mapId }, { $inc: { plays: 1 } });

                    // does refreshing games break currently running games?
                    // this.sio.emit('refresh-games');

                    this.sio.to(data.matchId).emit('game-started', { match });

                    this.timers[data.matchId] = setTimeout(() => {
                        const winnerPlayerIndex = this.classicMatches[data.matchId].players.reduce((acc, cur, index) => {
                            if (cur.found > this.classicMatches[data.matchId].players[acc].found) {
                                return index;
                            } else {
                                return acc;
                            }
                        }, 0);
                        this.triggerGameEndClassic(data.matchId, winnerPlayerIndex);
                    }, this.classicMatches[data.matchId].gameDuration * 1000);
                } catch (e) {
                    console.error(e);
                }
            });

            socket.on('c/abandon-game', async () => {
                try {
                    const matchId = Array.from(socket.rooms)[1];
                    if (!this.classicMatches[matchId]) return;
                    const playerIndex = this.classicMatches[matchId].players.findIndex((p) => p.id === socket.id);
                    if (playerIndex === -1) return;
                    this.classicMatches[matchId].players[playerIndex].forfeitter = true;
                    const activePlayers = this.classicMatches[matchId].players.filter((p) => !p.forfeitter);
                    if (activePlayers.length < 2) {
                        this.triggerGameEndClassic(
                            matchId,
                            this.classicMatches[matchId].players.findIndex((p) => p.id === activePlayers[0].id),
                        );
                    }
                    socket.emit('game-abandonned');
                    socket.leave(matchId);
                    this.sio.to(matchId).emit('update-match', {
                        match: this.classicMatches[matchId],
                    });
                } catch (e) {
                    console.error(e);
                }
            });

            socket.on('c/validate-coords', async ({ x, y, found }) => {
                try {
                    console.log('c/validate-coords', x, y, found, Array.from(socket.rooms)[1], socket.id);
                    const res = await this.gameService.validateCoords({
                        differences: this.diffByMatch[Array.from(socket.rooms)[1]]?.diff,
                        x,
                        y,
                        found,
                    });
                    console.log(res);
                    socket.emit('validate-coords', { res, x, y });
                    const playerIndex = this.classicMatches[Array.from(socket.rooms)[1]].players.findIndex((p) => p.id === socket.id);
                    if (res >= 0) {
                        this.classicMatches[Array.from(socket.rooms)[1]].foundDifferencesIndex?.push(res);
                        if (this.classicMatches[Array.from(socket.rooms)[1]].players[playerIndex]) {
                            this.classicMatches[Array.from(socket.rooms)[1]].players[playerIndex].found++;
                            if (
                                this.classicMatches[Array.from(socket.rooms)[1]].players[playerIndex].found >=
                                this.diffByMatch[Array.from(socket.rooms)[1]].diff.length / 2
                            )
                                this.triggerGameEndClassic(Array.from(socket.rooms)[1], playerIndex);
                        }
                        this.sio.to(Array.from(socket.rooms)[1]).emit('update-match', {
                            match: this.classicMatches[Array.from(socket.rooms)[1]],
                        });
                        socket.to(Array.from(socket.rooms)[1]).emit('notify-difference-found', {
                            playerIndex,
                            diff: res,
                        });
                    } else {
                        socket.to(Array.from(socket.rooms)[1]).emit('notify-difference-error', {
                            playerIndex,
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            });
            // END OF SOCKET FUNCTIONS FOR CLASSIC GAME MODE
            //
            //
            //
            // START OF SOCKET FUNCTIONS FOR TIME LIMIT GAME MODE
            socket.on('tl/get-lobbies', async () => {
                socket.emit('tl/update-awaiting-matches', {
                    matches: Object.values(this.timeLimitMatches),
                });
            });

            socket.on(
                'tl/create-lobby',
                async (data: { visibility?: string; creatorUid?: string; gameDuration: number; bonusTimeOnHit: number; cheatAllowed: boolean }) => {
                    const matchId = randomUUID();
                    this.timeLimitMatches[matchId] = {
                        gamemode: 'time-limit',
                        matchId,
                        startTime: 0,
                        players: [
                            {
                                id: socket.id,
                                uid: (socket.handshake.query.uid as string) ?? data.creatorUid,
                                name: (socket.handshake.query.username as string) ?? socket.id,
                                profilePic: (socket.handshake.query.profilePic as string) ?? '',
                                found: 0,
                                creator: true,
                            },
                        ],
                        spectators: [],
                        visibility: data.visibility,
                        gameDuration: data.gameDuration,
                        bonusTimeOnHit: data.bonusTimeOnHit,
                        cheatAllowed: data.cheatAllowed,
                    };
                    socket.join(matchId);
                    this.sio.emit('tl/update-awaiting-matches', {
                        matches: Object.values(this.timeLimitMatches),
                    });
                },
            );

            socket.on('tl/join-lobby', async (data: { matchId: string; creatorUid?: string }) => {
                if (this.timeLimitMatches[data.matchId].players.length >= 4) {
                    socket.emit('error', { message: 'The lobby is full.' });
                    return;
                }
                this.timeLimitMatches[data.matchId].players.push({
                    id: socket.id,
                    uid: socket.handshake.query.uid as string,
                    name: (socket.handshake.query.username as string) ?? socket.id,
                    profilePic: (socket.handshake.query.profilePic as string) ?? '',
                    found: 0,
                });
                socket.join(data.matchId);
                this.sio.to(data.matchId).emit('tl/update-match-info', {
                    match: this.timeLimitMatches[data.matchId],
                });
                this.sio.emit('tl/update-awaiting-matches', {
                    matches: Object.values(this.timeLimitMatches),
                });
            });

            socket.on('tl/leave-lobby', async (data: { matchId: string }) => {
                try {
                    this.timeLimitMatches[data.matchId].players = this.timeLimitMatches[data.matchId].players.filter(
                        (player) => player.id !== socket.id,
                    );
                    if (this.timeLimitMatches[data.matchId].players.length === 0) {
                        delete this.timeLimitMatches[data.matchId];
                        this.sio.emit('tl/update-awaiting-matches', {
                            matches: Object.values(this.timeLimitMatches),
                        });
                    } else this.timeLimitMatches[data.matchId].players[0].creator = true;
                    this.sio.to(data.matchId).emit('tl/update-match-info', {
                        match: this.timeLimitMatches[data.matchId],
                    });
                    socket.leave(data.matchId);
                } catch (e) {
                    console.error(e);
                }
            });

            socket.on('tl/start-game', async (data: { matchId: string }) => {
                if (this.timeLimitMatches[data.matchId].players.length < 2) {
                    socket.emit('error', { message: 'Not enought players.' });
                    return;
                }

                const games = await this.gameService.getAllGames(true);
                const randomizedGames: Game[] = games.sort(() => Math.random() - 0.5);
                // const constants = await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_SETTINGS).findOne({});

                this.timeLimitMatches[data.matchId].startTime = Date.now();
                this.timeLimitMatches[data.matchId].games = randomizedGames;
                this.timeLimitMatches[data.matchId].gamesIndex = 0;
                this.timeLimitMatches[data.matchId].differenceIndex = randomizedGames.map((game) =>
                    Math.floor(Math.random() * game.imageDifference.length),
                );

                const match: NewMatch = {
                    ...this.timeLimitMatches[data.matchId],
                    gamemode: 'time-limit',
                };

                await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).insertOne(match);

                this.sio.emit('tl/update-awaiting-matches', {
                    matches: Object.values(this.timeLimitMatches),
                });

                this.sio.emit('s/update-awaiting-matches', {
                    matches: [...Object.values(this.classicMatches), ...Object.values(this.timeLimitMatches)],
                });

                this.sio.to(data.matchId).emit('tl/game-started', { match });

                this.timers[data.matchId] = setTimeout(() => {
                    this.triggerGameEndTimeLimit(data.matchId);
                }, this.timeLimitMatches[data.matchId].gameDuration * 1000);
            });

            socket.on('tl/abandon-game', async () => {
                try {
                    const matchId = Array.from(socket.rooms)[1];
                    if (!this.timeLimitMatches[matchId]) return;
                    const playerIndex = this.timeLimitMatches[matchId].players.findIndex((p) => p.id === socket.id);
                    if (playerIndex === -1) return;
                    this.timeLimitMatches[matchId].players[playerIndex].forfeitter = true;
                    const activePlayers = this.timeLimitMatches[matchId].players.filter((p) => !p.forfeitter);
                    if (activePlayers.length < 2) {
                        this.triggerGameEndTimeLimit(
                            matchId,
                            this.timeLimitMatches[matchId].players.findIndex((p) => p.id === activePlayers[0].id),
                        );
                    }
                    socket.emit('game-abandonned');
                    socket.leave(matchId);
                    this.sio.to(matchId).emit('update-match', {
                        match: this.timeLimitMatches[matchId],
                    });
                } catch (e) {
                    console.error(e);
                }
            });

            // eslint-disable-next-line complexity
            socket.on('tl/validate-coords', async ({ x, y, found }) => {
                try {
                    const matchId = Array.from(socket.rooms)[1];
                    const match = this.timeLimitMatches[matchId];
                    const res = await this.gameService.validateCoords({
                        differences:
                            [match.games?.[match?.gamesIndex ?? 0].imageDifference[match.differenceIndex?.[match.gamesIndex ?? 0] ?? 0] ?? []] ?? [],
                        x,
                        y,
                        found,
                    });
                    socket.emit('validate-coords', { res, x, y });
                    const playerIndex = this.timeLimitMatches[matchId].players.findIndex((p) => p.id === socket.id);
                    if (res >= 0) {
                        if (this.timeLimitMatches[matchId]?.gamesIndex !== undefined) {
                            this.timeLimitMatches[matchId].gamesIndex = (this.timeLimitMatches[matchId]?.gamesIndex ?? 0) + 1;
                            // if ((this.timeLimitMatches[matchId]?.gamesIndex ?? 0) >= (match.games?.length ?? 0)) {
                            //     this.triggerGameEndTimeLimit(matchId);
                            // }
                        }

                        if (this.timeLimitMatches[matchId].players[playerIndex]) {
                            this.timeLimitMatches[matchId].players[playerIndex].found++;

                            clearTimeout(this.timers[matchId]);
                            const foundDifferences = this.timeLimitMatches[matchId].players.reduce((total, player) => total + player.found, 0) ?? 0;
                            const possibleTimeLeft =
                                match.gameDuration - (Date.now() - match.startTime) / 1000 + match.bonusTimeOnHit * foundDifferences;
                            this.timers[matchId] = setTimeout(() => {
                                this.triggerGameEndTimeLimit(matchId);
                            }, Math.min(match.gameDuration, possibleTimeLeft) * 1000);

                            if (
                                this.timeLimitMatches[matchId].players[playerIndex].found >= (match.games?.length ?? 0) ||
                                (this.timeLimitMatches[matchId]?.gamesIndex ?? 0) >= (match.games?.length ?? 0)
                            ) {
                                this.timeLimitMatches[matchId].gamesIndex = (this.timeLimitMatches[matchId]?.gamesIndex ?? 0) - 1;
                                this.triggerGameEndTimeLimit(matchId);
                            }
                        }

                        this.sio.to(matchId).emit('update-match', {
                            match: this.timeLimitMatches[matchId],
                        });
                        socket.to(matchId).emit('notify-difference-found', {
                            playerIndex,
                            diff: res,
                        });
                    } else {
                        socket.to(matchId).emit('notify-difference-error', {
                            playerIndex,
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            });

            // END OF SOCKET FUNCTIONS FOR TIME LIMIT GAME MODE

            socket.on('game-deleted', (data: any) => {
                this.handleIter(data.gameId, (sock: any) => {
                    (this.sio.sockets.sockets.get(sock) as any).leave(data.gameId);
                });
                this.sio.emit('game-deleted', { gameId: data.gameId });
            });

            socket.on('delete-all-games', async () => {
                const games = await this.gameService.getAllGames();
                const gameIds = games.map((el: any) => el.id);
                gameIds.forEach(async (game: string, index: number) => {
                    await this.gameService.deleteGame(game);
                    this.handleIter(game, (sock: any) => {
                        (this.sio.sockets.sockets.get(sock) as any).leave(game);
                    });
                    this.sio.emit('game-deleted', { gameId: game });
                    if (index === gameIds.length - 1) this.sio.emit('refresh-games');
                });
            });

            socket.on('room-message', (data: any) => {
                socket.to(Array.from(socket.rooms)[1]).emit('room-message', { message: data.message });
            });

            socket.on('reset-game-history', async () => {
                await this.gameService.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).deleteMany({ endTime: { $exists: true } });
            });

            socket.on('reset-scores', async (data: any) => {
                const filter = data && data.gameId ? { id: data.gameId } : {};
                await this.gameService.dbService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES).updateMany(filter, {
                    $set: {
                        soloLeaderboard: [
                            { playerName: 'Lorem', recordTime: 213 },
                            { playerName: 'Ipsum', recordTime: 581 },
                            { playerName: 'Dolor', recordTime: 609 },
                        ],
                        multiLeaderboard: [
                            { playerName: 'Lorem', recordTime: 213 },
                            { playerName: 'Ipsum', recordTime: 581 },
                            { playerName: 'Dolor', recordTime: 609 },
                        ],
                    },
                });
                this.sio.emit('refresh-games');
            });

            // socket.on('disconnecting', () => {
            //     if (socket.rooms.size > 1) {
            //         const roomsToLeave = new Set([...socket.rooms].filter((room) => room !== socket.id));
            //         roomsToLeave.forEach(async (room) => {
            //             const isWaitingRoom = await this.gameService.dbService.db
            //                 .collection(DB_CONSTS.DB_COLLECTION_GAMES)
            //                 .findOne({ id: room }, { projection: { id: 1 } });
            //             if (isWaitingRoom) {
            //                 if (this.isJoiner.includes(socket.id)) {
            //                     this.isJoiner.filter((joiner: any) => joiner !== socket.id);
            //                     socket.to(room).emit('cancel-from-joiner');
            //                 } else {
            //                     this.cancelFromClient({ gameId: room });
            //                 }
            //             } else {
            //                 await this.gameService.dbService.db
            //                     .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
            //                     .findOne({ id: room }, { projection: { player0: 1, player1: 1 } });
            //                 socket.to(room).emit('enemy-abandon');

            //                 this.handleIter(room, (sock: any) => {
            //                     (this.sio.sockets.sockets.get(sock) as any).leave(room);
            //                 });
            //             }
            //         });
            //     }
            // });
        });
    }
}
