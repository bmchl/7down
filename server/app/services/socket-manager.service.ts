/* eslint-disable max-lines */
import { DB_CONSTS } from '@app/utils/env';
import { Game, Match } from '@common/game';
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

@Service()
export class SocketManager {
    creatorNames: CreatorNameMap = {};
    joinersMap: JoinersMap = {};
    private diffByMatch: { [matchId: string]: { diff: number[][][]; startTime: number } } = {};
    private isJoiner: any = [];
    private sio: io.Server;
    private tlWaiting: { socketId: string; name: string } | undefined;
    private tlMatches: {
        [matchId: string]: {
            games: Game[];
            index: number;
            startTime: number;
            player0: { id: string; found: number };
            player1: { id: string; found: number };
            processing: boolean;
        };
    } = {};

    constructor(server: http.Server, public dbService: DatabaseService, public gameService: GamesService) {
        this.isJoiner = [];
        this.sio = new io.Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
        this.creatorNames = {};
    }

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

        this.sio.emit('update-game-button', { gameId: data.gameId, gameOn: false });

        await this.gameService.dbService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES).updateOne({ id: data.gameId }, { $set: { isGameOn: false } });
    };

    createGameTl = async (sockets: any[], data: any) => {
        const matchId = randomUUID();
        sockets.forEach((socket) => socket.join(matchId));
        if (sockets.length >= 2) this.sio.to(matchId).emit('game-filled-tl');
        const games = await this.gameService.getAllGames(true);
        const randomizedGames: Game[] = games.sort(() => Math.random() - 0.5);
        const constants = await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_SETTINGS).findOne({});

        const match: Match = {
            id: matchId,
            player0: data.player0,
            player1: data.player1,
            multiplayer: !data.solo,
            timeLimit: true,
            startDate: Date.now(),
            winner: '',
            completionTime: 0,
            playerAbandoned: '',
        };

        await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).insertOne(match);

        this.tlMatches[matchId] = {
            games: randomizedGames,
            index: 0,
            startTime: Date.now(),
            player0: {
                id: sockets[0].id,
                found: 0,
            },
            player1: {
                id: sockets.length >= 2 ? sockets[1].id : 'N/A',
                found: 0,
            },
            processing: false,
        };
        this.sio.to(matchId).emit('random-games', { games, constants, player0: data.player0, player1: data.player1 });
    };

    handleSockets(): void {
        this.sio.on('connection', (socket) => {
            socket.on('create-game', async (data: any) => {
                if (data.player0) this.creatorNames[data.gameId] = data.player0;
                this.sio.emit('update-game-button', { gameId: data.gameId, gameOn: true });
                await this.gameService.dbService.db
                    .collection(DB_CONSTS.DB_COLLECTION_GAMES)
                    .updateOne({ id: data.gameId }, { $set: { isGameOn: true } });
                socket.join(data.gameId);
                this.sio.to(data.gameId).emit('game-created');
                this.joinersMap[data.gameId] = [];
            });

            socket.on('join-game', async (data: any) => {
                if (this.creatorNames[data.gameId] === data.player1) {
                    data.player1 = data.player1 + ' (Joiner)';
                }
                this.isJoiner.push(socket.id);
                this.joinersMap[data.gameId].push({ name: data.player1, id: socket.id, accepted: false, gameId: data.gameId });
                socket.to(data.gameId).emit('player-joined', { players: this.joinersMap[data.gameId] });
                socket.join(data.gameId);
            });

            socket.on('create-game-tl', async (data: any) => {
                this.createGameTl([socket], { ...data, player1: 'N/A' });
            });

            socket.on('abandon-game-tl', () => {
                const matchId = Array.from(socket.rooms)[1];
                socket.leave(matchId);
                this.sio.to(matchId).emit('player-abandonned');
            });

            socket.on('join-approval', async (data: any) => {
                if (!data.accept) {
                    this.sio.to(data.gameId).emit('player-refuse');
                    this.handleIter(data.gameId, (sock: any) => {
                        if (this.isJoiner.includes(sock)) (this.sio.sockets.sockets.get(sock) as any).leave(data.gameId);
                        this.isJoiner = this.isJoiner.filter((joiner: any) => joiner !== sock);
                    });
                    this.joinersMap[data.gameId] = [];
                    this.sio.emit('update-game-button', { gameId: data.gameId, gameOn: false });
                    await this.gameService.dbService.db
                        .collection(DB_CONSTS.DB_COLLECTION_GAMES)
                        .updateOne({ id: data.gameId }, { $set: { isGameOn: false } });
                } else {
                    this.joinersMap[data.gameId]?.forEach(async (joiner: Joiner) => {
                        if (joiner.id !== data.joinerId) {
                            (this.sio.sockets.sockets.get(joiner.id) as any).emit('player-refuse');
                            (this.sio.sockets.sockets.get(joiner.id) as any).leave(data.gameId);
                        }
                    });
                    const matchId = randomUUID();
                    if (data.solo) {
                        socket.join(matchId);
                    } else {
                        this.handleIter(data.gameId, (sock: any) => {
                            this.isJoiner = this.isJoiner.filter((joiner: any) => joiner !== sock);
                            (this.sio.sockets.sockets.get(sock) as any).leave(data.gameId);
                            (this.sio.sockets.sockets.get(sock) as any).join(matchId);
                        });
                    }
                    const match: Match = {
                        id: matchId,
                        gameId: data.gameId,
                        player0: data.player0,
                        player1: data.player1,
                        multiplayer: !data.solo,
                        timeLimit: false,
                        startDate: Date.now(),
                        winner: '',
                        completionTime: 0,
                        playerAbandoned: '',
                    };

                    await this.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).insertOne(match);

                    this.sio.emit('update-game-button', { gameId: data.gameId, gameOn: false });
                    await this.gameService.dbService.db
                        .collection(DB_CONSTS.DB_COLLECTION_GAMES)
                        .updateOne({ id: data.gameId }, { $set: { isGameOn: false } });

                    this.diffByMatch[matchId] = {
                        diff: (
                            await this.gameService.dbService.db
                                .collection(DB_CONSTS.DB_COLLECTION_GAMES)
                                .findOne({ id: data.gameId }, { projection: { imageDifference: 1 } })
                        ).imageDifference,
                        startTime: Date.now(),
                    };

                    this.sio.to(matchId).emit('game-started', {
                        player0: this.creatorNames[data.gameId] + ' (Joiner)' === data.player1 ? data.player0 + ' (Createur)' : data.player0,
                        startDate: Date.now(),
                    });
                    this.joinersMap[data.gameId] = [];
                }
            });

            socket.on('validate-coords', async ({ x, y, found }) => {
                const res = await this.gameService.validateCoords({ differences: this.diffByMatch[Array.from(socket.rooms)[1]].diff, x, y, found });
                socket.emit('validate-coords', { res, x, y });
                if (res >= 0) socket.to(Array.from(socket.rooms)[1]).emit('notify-difference-found', { diff: res });
                else socket.to(Array.from(socket.rooms)[1]).emit('notify-difference-error');
            });

            socket.on('validate-coords-tl', async ({ x, y, found }) => {
                const matchId = Array.from(socket.rooms)[1];
                const completionTime = Date.now() - this.tlMatches[matchId].startTime;
                const matches = this.tlMatches[matchId];
                const res = await this.gameService.validateCoords({ differences: matches.games[matches.index].imageDifference, x, y, found });
                let gameEnded = false;
                if (res >= 0) {
                    if (socket.id === matches.player0.id) matches.player0.found++;
                    else matches.player1.found++;
                    matches.index++;
                    gameEnded = matches.index >= matches.games.length;
                }
                this.sio.to(matchId).emit('validate-coords-tl', { res, x, y, player: socket.id, gameEnded });
                if (gameEnded) {
                    await this.dbService.db
                        .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
                        .updateOne({ id: matchId }, { $set: { winner: '', completionTime } });
                    delete this.tlMatches[matchId];
                    this.handleIter(matchId, (sock: any) => {
                        (this.sio.sockets.sockets.get(sock) as any).leave(matchId as string);
                    });
                }
            });

            socket.on('cancel-from-client', this.cancelFromClient);

            socket.on('cancel-from-joiner', (gameId) => {
                socket.leave(gameId);
                this.joinersMap[gameId] = (this.joinersMap[gameId] || []).filter((joiner: Joiner) => joiner.id !== socket.id);
                socket.to(gameId).emit('player-joined', { players: this.joinersMap[gameId] });
            });

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

            socket.on('timer-end-tl', async () => {
                const matchId = Array.from(socket.rooms)[1];
                if (!this.tlMatches[matchId] || this.tlMatches[matchId].processing) return;
                this.tlMatches[matchId].processing = true;
                const completionTime = Date.now() - this.tlMatches[matchId].startTime;
                await this.dbService.db
                    .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
                    .updateOne({ id: matchId }, { $set: { winner: 'N/A', completionTime } });
                this.sio.to(matchId).emit('new-record', { newRecord: false });
                delete this.tlMatches[matchId];
                this.handleIter(matchId, (sock: any) => {
                    (this.sio.sockets.sockets.get(sock) as any).leave(matchId as string);
                });
            });

            socket.on('game-end', async (data) => {
                const matchId = Array.from(socket.rooms)[1];
                const winner = data.winner;
                const completionTime = Date.now() - this.diffByMatch[matchId].startTime + data.hintsUsed * data.penalty;
                const startDate = this.diffByMatch[matchId].startTime;
                const playerAbandoned = data.playerAbandoned;

                if (playerAbandoned) {
                    await this.dbService.db
                        .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
                        .updateOne({ id: matchId }, { $set: { playerAbandoned, completionTime } });

                    this.sio.to(matchId).emit('enemy-abandon');
                    this.handleIter(matchId, (sock: any) => {
                        (this.sio.sockets.sockets.get(sock) as any).leave(matchId as string);
                    });
                } else {
                    await this.dbService.db
                        .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
                        .updateOne({ id: matchId }, { $set: { winner, completionTime, startDate } });
                    const newRecord = await this.gameService.updateLeaderboard(matchId, completionTime);
                    this.sio.to(matchId).emit('new-record', { newRecord, completionTime });
                    delete this.diffByMatch[matchId];
                    this.handleIter(matchId, (sock: any) => {
                        (this.sio.sockets.sockets.get(sock) as any).leave(matchId as string);
                    });
                }
            });

            socket.on('denied', (socketJoiner) => {
                this.sio.to(socketJoiner.id).emit('player-refuse');
                const leaverSocket = this.sio.sockets.sockets.get(socketJoiner.id);
                if (leaverSocket) leaverSocket.leave(socketJoiner.gameId);
                this.joinersMap[socketJoiner.gameId] = this.joinersMap[socketJoiner.gameId].filter((joiner: Joiner) => joiner.id !== socketJoiner.id);
            });

            socket.on('room-message', (data: any) => {
                socket.to(Array.from(socket.rooms)[1]).emit('room-message', { message: data.message });
            });

            socket.on('global-message', (data: any) => {
                socket.broadcast.emit('global-message', data);
            });

            socket.on('reset-game-history', async () => {
                await this.gameService.dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).deleteMany({ endTime: { $exists: true } });
            });

            socket.on('join-waitlist-tl', async (data) => {
                if (this.tlWaiting) {
                    await this.createGameTl([socket, this.sio.sockets.sockets.get(this.tlWaiting.socketId)], {
                        player0: this.tlWaiting.name,
                        player1: data.player0,
                        solo: false,
                    });
                    this.tlWaiting = undefined;
                } else {
                    this.tlWaiting = {
                        socketId: socket.id,
                        name: data.player0,
                    };
                }
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

            socket.on('disconnecting', () => {
                if (socket.rooms.size > 1) {
                    const roomsToLeave = new Set([...socket.rooms].filter((room) => room !== socket.id));
                    roomsToLeave.forEach(async (room) => {
                        const isWaitingRoom = await this.gameService.dbService.db
                            .collection(DB_CONSTS.DB_COLLECTION_GAMES)
                            .findOne({ id: room }, { projection: { id: 1 } });
                        if (isWaitingRoom) {
                            if (this.isJoiner.includes(socket.id)) {
                                this.isJoiner.filter((joiner: any) => joiner !== socket.id);
                                socket.to(room).emit('cancel-from-joiner');
                            } else {
                                this.cancelFromClient({ gameId: room });
                            }
                        } else {
                            await this.gameService.dbService.db
                                .collection(DB_CONSTS.DB_COLLECTION_MATCHES)
                                .findOne({ id: room }, { projection: { player0: 1, player1: 1 } });
                            socket.to(room).emit('enemy-abandon');

                            this.handleIter(room, (sock: any) => {
                                (this.sio.sockets.sockets.get(sock) as any).leave(room);
                            });
                        }
                    });
                }
            });
        });
    }
}
