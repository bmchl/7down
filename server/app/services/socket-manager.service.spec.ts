/* eslint-disable max-lines */
import { DB_CONSTS } from '@app/utils/env';
import { Game } from '@common/game';
import { Server } from 'app/server';
import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as sinon from 'sinon';
import { io as ioClient, Socket } from 'socket.io-client';
import { Container } from 'typedi';
import { SocketManager } from './socket-manager.service';

const RESPONSE_DELAY = 500;
describe('SocketManager service tests', () => {
    let mongoServer: MongoMemoryServer;
    let uri = '';
    let service: SocketManager;
    let server: Server;
    let clientSocket: Socket;
    let clientSocket1: Socket;

    const urlString = 'http://localhost:3000';
    beforeEach(async () => {
        mongoServer = await MongoMemoryServer.create();
        uri = mongoServer.getUri();
        server = Container.get(Server);
        server.init();
        await server['dbService'].connectToServer(uri);
        service = server['socketManager'];
        clientSocket = ioClient(urlString);
        clientSocket1 = ioClient(urlString);
        const game: Game = {
            id: 'test',
            isGameOn: false,
            gameName: '',
            image: '',
            image1: '',
            imageDifference: [],
            difficulty: 0,
            differenceCount: 0,
            penalty: 0,
            soloLeaderboard: [],
            multiLeaderboard: [],
        };

        await server['dbService'].db.collection(DB_CONSTS.DB_COLLECTION_GAMES).insertOne(game);
        await server['dbService'].db.collection(DB_CONSTS.DB_COLLECTION_MATCHES).insertMany([
            {
                id: '1',
                gameId: '2',
                player0: 'test',
                player1: 'te1',
                endTime: '',
            },
            {
                id: '2',
                gameId: '2',
                player0: 'test',
                player1: 'te1',
            },
        ]);
        await server['dbService'].db.collection(DB_CONSTS.DB_COLLECTION_SETTINGS).insertOne({ initialTime: 30, penalty: 5, timeGainPerDiff: 5 });
    });

    afterEach(() => {
        clientSocket.close();
        clientSocket1.close();
        service['sio'].close();
        sinon.restore();
    });

    it('should add the socket to the gameId room upon creating a game', (done) => {
        clientSocket.emit('create-game', { gameId: 'test', player0: 'test_name' });
        clientSocket.on('game-created', () => {
            const newRoomSize = service['sio'].sockets.adapter.rooms.get('test')?.size;
            expect(newRoomSize).to.equal(1);
            done();
        });
    });

    it('should add the socket to the room after a join game event', (done) => {
        const roomId = 'test';
        clientSocket.emit('create-game', { gameId: 'test', player0: 'test_name' });
        setTimeout(() => {
            const initialRoomSize = service['sio'].sockets.adapter.rooms.get(roomId)?.size || 0;
            clientSocket1.emit('join-game', { gameId: roomId });
            setTimeout(() => {
                const updatedRoomSize = service['sio'].sockets.adapter.rooms.get(roomId)?.size || 0;
                expect(updatedRoomSize).to.equal(initialRoomSize + 1);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should put both the user in the matchId room, accept false', (done) => {
        clientSocket.emit('create-game', { gameId: 'test', player0: 'test_name' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket.emit('join-approval', { solo: false, accept: false, gameId: 'test' });
            setTimeout(() => {
                const newRoomSize = service['sio'].sockets.adapter.rooms.get('test')?.size;
                expect(newRoomSize).to.equal(1);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should put both the user in the matchId room, accept true', (done) => {
        clientSocket.emit('create-game', { gameId: 'test', player0: 'p1' });
        const joinersMap = { test: [{ gameId: 'test', name: 'p2', id: '0' }] };
        service['joinersMap'] = joinersMap;
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test', player1: 'p2' });
            setTimeout(() => {
                clientSocket.emit('join-approval', { solo: false, accept: true, gameId: 'test', player0: 'p1', player1: 'p2', joinerId: '0' });
                setTimeout(() => {
                    const newRoomSize = service['sio'].sockets.adapter.rooms.get('test')?.size;
                    expect(newRoomSize).to.equal(undefined);
                    done();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should put the user in the matchId room, solo true', (done) => {
        clientSocket.emit('join-approval', { solo: true, accept: true, gameId: 'test', player0: 'p1', player1: 'p2' });
        setTimeout(() => {
            const newRoomSize = service['sio'].sockets.adapter.rooms.get('test')?.size;
            expect(newRoomSize).to.equal(undefined);
            done();
        }, RESPONSE_DELAY);
    });

    it('should remove everyone from gameId room when creator leaves', (done) => {
        clientSocket.emit('create-game', { gameId: 'test' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket.emit('cancel-from-client', { gameId: 'test' });
            setTimeout(() => {
                const newRoomSize = service['sio'].sockets.adapter.rooms.get('test')?.size;
                expect(newRoomSize).to.equal(undefined);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should remove the joiner from gameId room when he leaves', (done) => {
        clientSocket.emit('create-game', { gameId: 'test' });
        clientSocket1.emit('join-game', { gameId: 'test' });
        setTimeout(() => {
            clientSocket1.emit('cancel-from-joiner', { gameId: 'test' });
            setTimeout(() => {
                const newRoomSize = service['sio'].sockets.adapter.rooms.get('test')?.size;
                expect(newRoomSize).to.equal(1);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should remove both players from room on abandon', (done) => {
        clientSocket.emit('create-game', { gameId: 'test' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket.emit('game-end', { gameId: 'test', abandon: true });
            setTimeout(() => {
                const newRoomSize = service['sio'].sockets.adapter.rooms.get('fake')?.size;
                expect(newRoomSize).to.equal(undefined);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should remove both players from waiting room on game delete', (done) => {
        clientSocket.emit('create-game', { gameId: 'test' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket.emit('game-deleted', { gameId: 'test' });
            setTimeout(() => {
                const newRoomSize = service['sio'].sockets.adapter.rooms.get('fake')?.size;
                expect(newRoomSize).to.equal(undefined);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should send new record and remove both players from room on game end', (done) => {
        sinon.stub(service['gameService'], 'updateLeaderboard').resolves(false);
        const diffByMatch = { test: { diff: [], startTime: Date.now() } };
        service['diffByMatch'] = diffByMatch;
        clientSocket.emit('create-game', { gameId: 'test' });
        const spy = sinon.spy(clientSocket1, 'on');
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket.emit('game-end', { gameId: 'test' });
            setTimeout(() => {
                const newRoomSize = service['sio'].sockets.adapter.rooms.get('fake')?.size;
                expect(newRoomSize).to.equal(undefined);
                expect(spy.called);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should send new record and remove both players from room on game end', (done) => {
        sinon.stub(service['gameService'], 'updateLeaderboard').resolves(false);
        const diffByMatch = { test: { diff: [], startTime: Date.now() } };
        service['diffByMatch'] = diffByMatch;
        clientSocket.emit('create-game', { gameId: 'test' });
        const spy = sinon.spy(clientSocket1, 'on');
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket.emit('game-end', { gameId: 'test', playerAbandoned: true });
            setTimeout(() => {
                const newRoomSize = service['sio'].sockets.adapter.rooms.get('fake')?.size;
                expect(newRoomSize).to.equal(undefined);
                expect(spy.called);
                done();
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should send a message to other people in the room', (done) => {
        clientSocket.emit('create-game', { gameId: 'test' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket1.on('room-message', (data) => {
                expect(data.message).to.equal('text');
                done();
            });
            clientSocket.emit('room-message', { message: 'text' });
        }, RESPONSE_DELAY);
    });

    it('should send a message to every room', (done) => {
        clientSocket.emit('create-game', { gameId: 'test' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            clientSocket1.on('global-message', (data) => {
                expect(data.message).to.equal('text');
                done();
            });
            clientSocket.emit('global-message', { message: 'text' });
        }, RESPONSE_DELAY);
    });

    it('should remove everyone from room after create and when ', (done) => {
        clientSocket.emit('create-game', { gameId: 'test' });
        setTimeout(async () => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            await server['dbService'].db.collection(DB_CONSTS.DB_COLLECTION_GAMES).updateOne({ id: 'test' }, { $set: { id: 'newid' } });
            clientSocket.on('enemy-abandon', () => {
                done();
            });
            clientSocket1.disconnect();
        }, RESPONSE_DELAY);
    });

    it('disconnecting from waiting room should emit cancel-from-joiner', (done) => {
        service['diffByMatch'] = {};
        const spy = sinon.spy(clientSocket, 'on');
        clientSocket.emit('create-game', { gameId: 'test' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            sinon.stub(service['gameService'].dbService.db, 'collection').returns({ findOne: () => true });
            sinon.stub(service['isJoiner'], 'includes').returns(true);
            setTimeout(() => {
                clientSocket1.disconnect();
                setTimeout(() => {
                    expect(spy.called);
                    done();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should send validate coords on validate coords', (done) => {
        sinon.stub(service['gameService'], 'validateCoords').resolves(1);
        clientSocket.emit('create-game', { gameId: 'test', player0: 'test_name' });
        const spy = sinon.spy(clientSocket1, 'on');
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test', player1: 'test_name' });
            setTimeout(() => {
                const diffByMatch = { test: { diff: [], startTime: Date.now() } };
                service['diffByMatch'] = diffByMatch;
                clientSocket.emit('validate-coords', { x: 0, y: 0, found: [] });
                setTimeout(() => {
                    expect(spy.called);
                    done();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should send validate coords on validate coords', (done) => {
        sinon.stub(service['gameService'], 'validateCoords').resolves(-1);
        clientSocket.emit('create-game', { gameId: 'test', player0: 'test_name' });
        const spy = sinon.spy(clientSocket1, 'on');
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test', player1: 'test_name 1' });
            setTimeout(() => {
                const diffByMatch = { test: { diff: [], startTime: Date.now() } };
                service['diffByMatch'] = diffByMatch;
                clientSocket.emit('validate-coords', { x: 0, y: 0, found: [] });
                setTimeout(() => {
                    expect(spy.called);
                    done();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should delete-all-games', (done) => {
        sinon.stub(service['gameService'], 'getAllGames').resolves([{ id: '1' }]);
        sinon.stub(service['gameService'], 'deleteGame').resolves();
        clientSocket.emit('create-game', { gameId: '1', player0: 'test_name' });

        clientSocket.on('refresh-games', () => {
            done();
        });

        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test' });
            setTimeout(() => {
                clientSocket.emit('delete-all-games');
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should reset-scores', (done) => {
        sinon.stub(service['gameService'].dbService.db.collection(DB_CONSTS.DB_COLLECTION_GAMES), 'updateMany').resolves();
        clientSocket.on('refresh-games', () => {
            done();
        });
        clientSocket.emit('reset-scores', { gameId: '1', player0: 'test_name' });
    });

    it('should reset-game-history', (done) => {
        clientSocket.emit('reset-game-history');
        const spy = sinon.stub(service['gameService'].dbService.db.collection(DB_CONSTS.DB_COLLECTION_MATCHES), 'deleteMany').resolves();

        setTimeout(async () => {
            expect(spy.called);
            done();
        }, RESPONSE_DELAY);
    });

    it('should create game tl', (done) => {
        clientSocket.on('random-games', () => {
            done();
        });
        clientSocket.emit('create-game-tl');
    });

    it('should abandon game tl', (done) => {
        clientSocket.on('player-abandonned', () => {
            done();
        });

        clientSocket.emit('join-waitlist-tl', {
            player0: 'player1',
        });
        setTimeout(() => {
            clientSocket1.emit('join-waitlist-tl', {
                player0: 'player2',
            });
            setTimeout(() => {
                clientSocket1.emit('abandon-game-tl');
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should return -1 if validate coords tl miss', (done) => {
        sinon.stub(service['gameService'], 'validateCoords').resolves(-1);
        clientSocket.on('validate-coords-tl', (data) => {
            expect(data.res).to.equal(-1);
            done();
        });

        clientSocket.emit('join-waitlist-tl', {
            player0: 'player1',
        });
        setTimeout(() => {
            clientSocket1.emit('join-waitlist-tl', {
                player0: 'player2',
            });
            setTimeout(() => {
                clientSocket1.emit('validate-coords-tl', { x: 0, y: 0, found: [] });
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should return 1 if validate coords tl miss', (done) => {
        sinon.stub(service.gameService, 'validateCoords').resolves(1);
        clientSocket.on('validate-coords-tl', (data) => {
            expect(data.res).to.equal(1);
            done();
        });

        clientSocket.emit('join-waitlist-tl', {
            player0: 'player1',
        });
        setTimeout(() => {
            clientSocket1.emit('join-waitlist-tl', {
                player0: 'player2',
            });
            setTimeout(() => {
                clientSocket1.emit('validate-coords-tl', { x: 0, y: 0, found: [] });
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should return 1 if validate coords tl miss', (done) => {
        sinon.stub(service.gameService, 'validateCoords').resolves(1);
        clientSocket.on('validate-coords-tl', (data) => {
            expect(data.res).to.equal(1);
            done();
        });

        clientSocket.emit('join-waitlist-tl', {
            player0: 'player1',
        });
        setTimeout(() => {
            clientSocket1.emit('join-waitlist-tl', {
                player0: 'player2',
            });
            setTimeout(() => {
                clientSocket.emit('validate-coords-tl', { x: 0, y: 0, found: [] });
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should delete matchid from tlMatches on timer-end-tl', (done) => {
        clientSocket.emit('join-waitlist-tl', {
            player0: 'player1',
        });
        setTimeout(() => {
            clientSocket1.emit('join-waitlist-tl', {
                player0: 'player2',
            });
            setTimeout(() => {
                clientSocket.emit('timer-end-tl');
                setTimeout(() => {
                    expect(Object.keys(service['tlMatches']).length).to.equal(0);
                    done();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should not delete matchid from tlMatches on game-end-tl if not abandon', (done) => {
        clientSocket.emit('join-waitlist-tl', {
            player0: 'player1',
        });
        setTimeout(() => {
            clientSocket1.emit('join-waitlist-tl', {
                player0: 'player2',
            });
            setTimeout(() => {
                clientSocket.emit('game-end-tl');
                setTimeout(() => {
                    expect(Object.keys(service['tlMatches']).length).to.equal(1);
                    done();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should not delete matchid from tlMatches on game-end-tl if abandon', (done) => {
        clientSocket.emit('join-waitlist-tl', {
            player0: 'player1',
        });
        setTimeout(() => {
            clientSocket1.emit('join-waitlist-tl', {
                player0: 'player2',
            });
            setTimeout(() => {
                clientSocket.emit('game-end-tl');
                setTimeout(() => {
                    expect(Object.keys(service['tlMatches']).length).to.equal(1);
                    done();
                }, RESPONSE_DELAY);
            }, RESPONSE_DELAY);
        }, RESPONSE_DELAY);
    });

    it('should emit player-refuse on ', (done) => {
        clientSocket1.on('player-refuse', () => done());
        clientSocket.on('player-joined', ({ players }) => {
            clientSocket.emit('denied', players[0]);
        });
        clientSocket.emit('create-game', { gameId: 'test', player0: 'test_name' });
        setTimeout(() => {
            clientSocket1.emit('join-game', { gameId: 'test', player1: 'test_name_1' });
        }, RESPONSE_DELAY);
    });
});
